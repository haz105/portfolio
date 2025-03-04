let data = [];
let commits = [];

// For the scatterplot
let globalXScale, globalYScale;
let selectedCommits = [];

// For the first scrolly
let NUM_ITEMS, ITEM_HEIGHT, VISIBLE_COUNT, totalHeight;

// For the second scrolly
let FILE_ITEM_HEIGHT = 70;
let FILE_VISIBLE_COUNT = 8; // how many commits we show at once
let fileTotalHeight = 0;

// An ordinal color scale by line.type
let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

async function loadData() {
  // 1) Load CSV
  data = await d3.csv("loc.csv", row => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    datetime: new Date(row.datetime),
  }));

  // 2) Group into commits
  processCommits();

  // 3) Setup first scrolly (commits -> scatterplot)
  NUM_ITEMS = commits.length;
  ITEM_HEIGHT = 70;
  VISIBLE_COUNT = 10;
  totalHeight = (NUM_ITEMS - 1) * ITEM_HEIGHT;

  const scrollContainer = d3.select('#scroll-container');
  d3.select('#spacer').style('height', `${totalHeight}px`);
  scrollContainer.on('scroll', () => {
    let scrollTop = scrollContainer.property('scrollTop');
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderItems(startIndex);
  });
  renderItems(0); // render initial commits in scrolly

  // 4) Setup second scrolly (also commits in time, but we show lines)
  fileTotalHeight = (commits.length - 1) * FILE_ITEM_HEIGHT;
  const scrollContainerFiles = d3.select('#scroll-container-files');
  d3.select('#spacer-files').style('height', `${fileTotalHeight}px`);
  scrollContainerFiles.on('scroll', () => {
    let scrollTop = scrollContainerFiles.property('scrollTop');
    let startIndex = Math.floor(scrollTop / FILE_ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - FILE_VISIBLE_COUNT));
    renderFileItems(startIndex);
  });
  renderFileItems(0); // render initial

  // 5) Show stats & scatterplot with all commits to start
  displayStats();
  updateScatterplot(commits);
}

// Convert CSV rows -> commits
function processCommits() {
  // Group by commit ID
  commits = d3.groups(data, d => d.commit).map(([commit, lines]) => {
    const { author, datetime } = lines[0];
    return {
      id: commit,
      url: 'https://github.com/yourrepo/commit/' + commit,
      author,
      datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
      totalLines: lines.length,
      lines
    };
  });
  // Sort commits by time so we can scroll chronologically
  commits.sort((a, b) => d3.ascending(a.datetime, b.datetime));
}

/** FIRST SCROLLY: Renders a slice of commits for the scatterplot scrolly. */
function renderItems(startIndex) {
  const itemsContainer = d3.select('#items-container');
  itemsContainer.selectAll('div').remove();

  let endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  let slice = commits.slice(startIndex, endIndex);

  // Update scatterplot with just that slice
  updateScatterplot(slice);

  // Render text items
  itemsContainer.selectAll('div')
    .data(slice)
    .enter()
    .append('div')
    .attr('class', 'item')
    .html((commit, i) => {
      const dateStr = commit.datetime.toLocaleString("en", {dateStyle: "full", timeStyle: "short"});
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
    })
    .style('top', (_, i) => `${i * ITEM_HEIGHT}px`);
}

/** SECOND SCROLLY: Each item is also a commit in time, but we show lines in .files. */
function renderFileItems(startIndex) {
  const itemsContainer = d3.select('#items-container-files');
  itemsContainer.selectAll('div').remove();

  let endIndex = Math.min(startIndex + FILE_VISIBLE_COUNT, commits.length);
  let slice = commits.slice(startIndex, endIndex);

  // For each commit in the slice, we create a "file-item" in the scrolly narrative
  itemsContainer.selectAll('div')
    .data(slice)
    .enter()
    .append('div')
    .attr('class', 'file-item')
    .html((commit, i) => {
      const dateStr = commit.datetime.toLocaleString("en", {dateStyle: "full", timeStyle: "short"});
      return `
        <p style="margin:0;">
          <strong>${dateStr}</strong>: 
          This commit edited ${commit.totalLines} lines total.
        </p>
      `;
    })
    .style('top', (_, i) => `${i * FILE_ITEM_HEIGHT}px`);

  // Also show lines for the *most recently rendered commit* (or a combined slice).
  // If you only want to show the lines for the top commit in the slice:
  //   displayCommitFiles( slice.slice(-1) );
  // or show lines for all commits in the slice:
  displayCommitFiles(slice);
}

/** Display summary stats for entire dataset. */
function displayStats() {
  const container = d3.select('#stats').html('');

  const allLines = commits.flatMap(c => c.lines);
  const numCommits = commits.length;
  const numFiles = d3.groups(allLines, d => d.file).length;
  const totalLoc = allLines.length;

  const statsData = [
    { label: 'COMMITS', value: numCommits },
    { label: 'FILES', value: numFiles },
    { label: 'TOTAL LOC', value: totalLoc },
  ];

  // Render them
  container.selectAll('div')
    .data(statsData)
    .enter()
    .append('div')
    .html(d => `<div><strong>${d.label}</strong></div><div>${d.value}</div>`);
}

/** Show lines in .files for the given commits.  */
function displayCommitFiles(commitSlice) {
  // Flatten all lines in these commits
  const lines = commitSlice.flatMap(d => d.lines);
  // Group by file if you still want to show them by file
  let files = d3.groups(lines, d => d.file).map(([f, lines]) => ({file: f, lines}));
  files.sort((a,b)=> d3.descending(a.lines.length,b.lines.length));

  const container = d3.select('.files');
  container.selectAll('div').remove(); // clear old

  // Create a card per file
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

/** Scatterplot for whichever commits we pass in. */
function updateScatterplot(filteredCommits) {
  d3.select('svg').remove();
  const container = d3.select('#chart');
  const width = container.node().clientWidth || 800;
  const height = width * 0.5;
  const margin = { top: 10, right: 50, bottom: 30, left: 50 };

  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height);

  const xScale = d3.scaleTime()
    .domain(d3.extent(filteredCommits, d => d.datetime))
    .range([margin.left, width - margin.right])
    .nice();

  const yScale = d3.scaleLinear()
    .domain([0,24])
    .range([height - margin.bottom, margin.top]);

  globalXScale = xScale;
  globalYScale = yScale;

  const [minLines, maxLines] = d3.extent(filteredCommits, d => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines || 0, maxLines || 1])
    .range([2, 30]);

  // Sort so bigger circles on top
  let sorted = [...filteredCommits].sort((a,b) => b.totalLines - a.totalLines);

  // Circles
  svg.selectAll('circle')
    .data(sorted)
    .enter()
    .append('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .attr('fill-opacity', 0.7);

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
}

/* (Optional) brushing, tooltip, etc... omitted for brevity */
document.addEventListener('DOMContentLoaded', loadData);
