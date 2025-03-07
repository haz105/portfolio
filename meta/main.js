let data = [];
let commits = [];

// For the scatterplot brush & tooltip
let globalXScale, globalYScale;
let brushSelection = null;

// For the first scrollytelling
let NUM_ITEMS, ITEM_HEIGHT, VISIBLE_COUNT, totalHeight;

// For the second scrollytelling
let FILE_ITEM_HEIGHT = 70;
let FILE_VISIBLE_COUNT = 8;
let fileTotalHeight = 0;

// Color scale by line type
let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

async function loadData() {
  // Load CSV
  data = await d3.csv("loc.csv", row => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    datetime: new Date(row.datetime),
  }));

  // Group CSV rows into commits
  processCommits();

  // Setup scrollytelling for commits (first container)
  NUM_ITEMS = commits.length;
  ITEM_HEIGHT = 70;
  VISIBLE_COUNT = 10;
  totalHeight = NUM_ITEMS * ITEM_HEIGHT;
  d3.select('#spacer').style('height', `${totalHeight}px`);

  const scrollContainer = d3.select('#scroll-container');
  scrollContainer.on('scroll', () => {
    let scrollTop = scrollContainer.property('scrollTop');
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderItems(startIndex);
  });
  renderItems(0); // initial

  // Setup scrollytelling for file details (second container)
  fileTotalHeight = commits.length * FILE_ITEM_HEIGHT;
  d3.select('#spacer-files').style('height', `${fileTotalHeight}px`);
  const scrollContainerFiles = d3.select('#scroll-container-files');
  scrollContainerFiles.on('scroll', () => {
    let scrollTop = scrollContainerFiles.property('scrollTop');
    let startIndex = Math.floor(scrollTop / FILE_ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - FILE_VISIBLE_COUNT));
    renderFileItems(startIndex);
  });
  renderFileItems(0);

  // Display summary stats (static)
  displayStats();
}

// Convert CSV rows -> commits
function processCommits() {
  commits = d3.groups(data, d => d.commit)
    .map(([commit, lines]) => {
      const { author, datetime } = lines[0];
      let ret = {
        id: commit,
        url: "https://github.com/YOUR_REPO/commit/" + commit,
        author,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };
      // Put the lines array as a non-enumerable property
      Object.defineProperty(ret, "lines", {
        value: lines,
        writable: false,
        configurable: false,
        enumerable: false
      });
      return ret;
    });
  commits.sort((a, b) => d3.ascending(a.datetime, b.datetime));
}

/* FIRST SCROLLY: Render the list of commits and update scatterplot with that slice. */
function renderItems(startIndex) {
  const itemsContainer = d3.select('#items-container');
  itemsContainer.style('transform', `translateY(${startIndex * ITEM_HEIGHT}px)`);

  let endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  let slice = commits.slice(startIndex, endIndex);

  // Update scatterplot to show only the slice
  updateScatterplot(slice);

  // Render the textual items
  let items = itemsContainer.selectAll('div').data(slice, d => d.id);
  items.exit().remove();

  let newItems = items.enter()
    .append('div')
    .attr('class', 'item')
    .html((commit, i) => {
      const dateStr = commit.datetime.toLocaleString("en", { dateStyle: "full", timeStyle: "short" });
      return `
        <p>
          On ${dateStr}, I made
          <a href="${commit.url}" target="_blank">
            ${i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}
          </a>.
          I edited ${commit.totalLines} lines across
          ${d3.rollups(commit.lines, v => v.length, d => d.file).length} files.
          Then I looked over all I had made, and I saw that it was very good.
        </p>
      `;
    });

  newItems.merge(items)
    .style('top', (_, i) => `${i * ITEM_HEIGHT}px`);
}

/* SECOND SCROLLY: Render commit file details. */
function renderFileItems(startIndex) {
  const itemsContainer = d3.select('#items-container-files');
  itemsContainer.style('transform', `translateY(${startIndex * FILE_ITEM_HEIGHT}px)`);

  let endIndex = Math.min(startIndex + FILE_VISIBLE_COUNT, commits.length);
  let slice = commits.slice(startIndex, endIndex);

  let items = itemsContainer.selectAll('div').data(slice, d => d.id);
  items.exit().remove();

  let newItems = items.enter()
    .append('div')
    .attr('class', 'file-item')
    .html((commit, i) => {
      const dateStr = commit.datetime.toLocaleString("en", { dateStyle: "full", timeStyle: "short" });
      return `
        <p style="margin:0;">
          <strong>${dateStr}</strong>:
          This commit edited ${commit.totalLines} lines total.
        </p>
      `;
    });

  newItems.merge(items)
    .style('top', (_, i) => `${i * FILE_ITEM_HEIGHT}px`);

  // Display file details for these commits
  displayCommitFiles(slice);
}

/* Display file details for a slice of commits. */
function displayCommitFiles(commitSlice) {
  const lines = commitSlice.flatMap(d => d.lines);
  let files = d3.groups(lines, d => d.file).map(([f, lines]) => ({ file: f, lines }));
  files.sort((a, b) => d3.descending(a.lines.length, b.lines.length));

  const container = d3.select('.files');
  container.selectAll('div').remove();

  let fileDivs = container.selectAll('div')
    .data(files)
    .enter()
    .append('div');

  fileDivs.append('dt')
    .html(d => `<code>${d.file}</code> <small>${d.lines.length} lines</small>`);

  fileDivs.append('dd')
    .selectAll('div')
    .data(d => d.lines)
    .enter()
    .append('div')
    .attr('class', 'line')
    .style('background', d => fileTypeColors(d.type));
}

function displayStats() {
  const container = d3.select('#stats').html("");

  // Remove or comment out the container styling lines:
  // container
  //   .style('max-width', '500px')
  //   .style('margin', '1em auto')
  //   .style('padding', '1em')
  //   .style('background-color', '#fdfdfd')
  //   .style('border', '1px solid #ccc')
  //   .style('border-radius', '5px')
  //   .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)');

  container.append('h2')
    .text('Summary Statistics')
    .style('text-align', 'center')
    .style('margin-bottom', '1em')
    .style('font-family', 'sans-serif');

  // Keep the flex container for a single-row layout
  const flexContainer = container.append('div')
    .style('display', 'flex')
    .style('flex-wrap', 'nowrap')
    .style('justify-content', 'space-between')
    .style('gap', '1em');

  const numCommits = commits.length;
  const numFiles = d3.group(data, d => d.file).size;
  const totalLOC = data.length;
  const maxDepth = d3.max(data, d => d.depth);
  const longestLine = d3.max(data, d => d.length);
  const fileLines = d3.rollups(data, v => d3.max(v, d => d.line), d => d.file);
  const maxLines = d3.max(fileLines, d => d[1]);

  const statsData = [
    { label: 'Commits', value: numCommits },
    { label: 'Files', value: numFiles },
    { label: 'Total LOC', value: totalLOC },
    { label: 'Max Depth', value: maxDepth },
    { label: 'Longest Line', value: longestLine },
    { label: 'Max Lines', value: maxLines }
  ];

  statsData.forEach(stat => {
    const statContainer = flexContainer.append('div')
      .style('flex', '1 1 auto')
      .style('text-align', 'center');

    // You can remove the background/border from each stat box too:
    // .style('padding', '0.5em')
    // .style('border', '1px solid #ddd')
    // .style('border-radius', '3px')
    // .style('background-color', '#fafafa')

    statContainer.append('div')
      .text(stat.label)
      .style('font-weight', 'bold');

    statContainer.append('div')
      .text(stat.value)
      .style('font-size', '1.2em');
  });
}



// ========== TOOLTIP FUNCTIONS ==========
function updateTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (!commit || Object.keys(commit).length === 0) {
    link.href = "";
    link.textContent = "";
    date.textContent = "";
    author.textContent = "";
    lines.textContent = "";
    return;
  }

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime ? commit.datetime.toLocaleString('en', { dateStyle: 'full' }) : '';
  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  const padding = 10;
  const tooltipWidth = tooltip.offsetWidth;
  let left = event.clientX + padding;
  if (left + tooltipWidth > window.innerWidth) {
    left = event.clientX - tooltipWidth - padding;
  }
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${event.clientY + padding}px`;
}

// ========== BRUSH FUNCTIONS ==========
function brushed(event) {
  brushSelection = event.selection;
  updateSelection();
  updateSelectionCount();
  updateLanguageBreakdown();
}

function isCommitSelected(commit) {
  if (!brushSelection) return false;
  const [[x0, y0], [x1, y1]] = brushSelection;
  const x = globalXScale(commit.datetime);
  const y = globalYScale(commit.hourFrac);
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function updateSelection() {
  d3.selectAll('circle').each(function(d) {
    if (isCommitSelected(d)) {
      d3.select(this).classed('selected', true).style('fill', 'orange');
    } else {
      d3.select(this).classed('selected', false).style('fill', 'steelblue');
    }
  });
}

function updateSelectionCount() {
  const selectedCommits = brushSelection
    ? commits.filter(isCommitSelected)
    : [];
  const countElement = document.getElementById('selection-count');
  if (selectedCommits.length) {
    countElement.textContent = `${selectedCommits.length} commits selected`;
    countElement.style.padding = '0.5em';
    countElement.style.backgroundColor = 'rgba(255,165,0,0.2)';
    countElement.style.border = '1px solid orange';
    countElement.style.borderRadius = '4px';
    countElement.style.fontWeight = 'bold';
    countElement.style.textAlign = 'left';
    countElement.style.maxWidth = '200px';  
    countElement.style.margin = '0.5em 0 0.5em 0.5em';
    countElement.style.display = 'block';
  } else {
    countElement.textContent = '';
    countElement.style.display = 'none';
  }
  return selectedCommits;
}

function updateLanguageBreakdown() {
  const selectedCommits = brushSelection
    ? commits.filter(isCommitSelected)
    : [];
  const container = document.getElementById('language-breakdown');
  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.style.display = 'grid';
  container.style.gridTemplateColumns = 'auto auto';
  container.style.gap = '0.5em 1em';
  container.style.padding = '0.5em';
  container.style.backgroundColor = 'rgba(255,165,0,0.1)';
  container.style.border = '1px solid orange';
  container.style.borderRadius = '4px';
  container.style.maxWidth = '300px';
  container.style.margin = '0.5em 0 0.5em 0.5em';

  const lines = selectedCommits.flatMap(d => d.lines);
  const breakdown = d3.rollup(
    lines,
    v => v.length,
    d => d.type
  );
  container.innerHTML = '';
  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);
    container.innerHTML += `<dt style="font-weight: bold; color: orange;">${language}</dt><dd style="margin: 0;">${count} lines (${formatted})</dd>`;
  }
  return breakdown;
}

// ========== SCATTERPLOT (DYNAMIC) ==========
// This is called every time the user scrolls, passing in the slice of commits to show.
function updateScatterplot(filteredCommits) {
  // Remove any old <svg> so we can redraw from scratch
  d3.select('#chart').selectAll('svg').remove();

  const container = d3.select('#chart');
  const containerWidth = container.node().clientWidth || 1000;
  const width = containerWidth;
  const height = width * 0.6;
  const margin = { top: 10, right: 50, bottom: 30, left: 50 };
  const usableWidth = width - margin.left - margin.right;
  const usableHeight = height - margin.top - margin.bottom;

  const svg = container.append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('width', '100%')
    .style('height', 'auto')
    .style('overflow', 'visible');

  // Domain uses ALL commits so axes don't jump around
  const xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([margin.left, width - margin.right])
    .nice();

  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  globalXScale = xScale;
  globalYScale = yScale;

  // Circle sizes based on totalLines in the slice
  // but we can also use entire commits if you prefer consistent sizing
  const [minLines, maxLines] = d3.extent(filteredCommits, d => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines || 0, maxLines || 1])
    .range([2, 30]);

  // Sort so bigger circles are on top
  let sorted = [...filteredCommits].sort((a, b) => b.totalLines - a.totalLines);

  // Optional: add background gridlines
  const gridlines = svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${margin.left},0)`);
  gridlines.call(
    d3.axisLeft(yScale)
      .tickFormat('')
      .tickSize(-usableWidth)
  );

  // Circles
  const dots = svg.append('g').attr('class', 'dots');
  dots.selectAll('circle')
    .data(sorted, d => d.id)
    .enter()
    .append('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .style('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', function (event, d) {
      d3.select(this).style('fill-opacity', 1);
      updateTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', function (event) {
      updateTooltipPosition(event);
    })
    .on('mouseleave', function () {
      d3.select(this).style('fill-opacity', 0.7);
      updateTooltipContent({});
      updateTooltipVisibility(false);
    });

  // Axes
  const xAxis = d3.axisBottom(xScale);
  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(xAxis);

  const yAxis = d3.axisLeft(yScale)
    .tickFormat(d => d === 24 ? '24:00' : String(d).padStart(2, '0') + ':00');
  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(yAxis);

  // Draw a right boundary line (optional)
  svg.append('line')
    .attr('x1', width - margin.right)
    .attr('y1', margin.top)
    .attr('x2', width - margin.right)
    .attr('y2', height - margin.bottom)
    .attr('stroke', 'black')
    .attr('stroke-width', 1);

  // Brush
  const brush = d3.brush().on('start brush end', brushed);
  const brushGroup = svg.append('g').attr('class', 'brush-group');
  brushGroup.call(brush);
  brushGroup.selectAll('.overlay').attr('pointer-events', 'all').lower();
  // Raise dots above the brush
  svg.select('.dots').raise();
}

document.addEventListener('DOMContentLoaded', loadData);

const pages = [
  { url: "",               title: "Home" },
  { url: "contact/",       title: "Contact" },
  { url: "projects/",      title: "Projects" },
  { url: "https://github.com/haz105", title: "Profile" },
  { url: "resume.html",    title: "Resume" },
  { url: "meta/",          title: "Meta"},
];

function inSubfolder() {
  return location.pathname.includes("/contact/") ||
         location.pathname.includes("/projects/") ||
         location.pathname.includes("/meta/");
}

const nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
  let { url, title } = p;

  if (inSubfolder() && !url.startsWith("http")) {
    url = "../" + url; 
  }

  const a = document.createElement("a");
  a.href = url;
  a.textContent = title;

  a.classList.toggle(
    "current",
    a.host === location.host && a.pathname === location.pathname
  );

  if (a.host !== location.host) {
    a.target = "_blank";
  }

  nav.append(a);
}

document.body.insertAdjacentHTML(
  "afterbegin",
  `
    <label class="color-scheme">
      Theme:
      <select id="theme-select">
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  `
);

const themeSelect = document.getElementById("theme-select");

if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
  themeSelect.value = localStorage.colorScheme;
}

themeSelect.addEventListener("input", function (event) {
  const newValue = event.target.value;
  setColorScheme(newValue);
  localStorage.colorScheme = newValue;
});

function setColorScheme(value) {
  document.documentElement.style.setProperty("color-scheme", value);
}

