let data = [];
let commits = [];
let globalXScale, globalYScale;
let brushSelection = null;     

async function loadData() {
  data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime)
  }));

  processCommits();
  displayStats();
  createScatterplot();
}

function processCommits() {
  commits = d3.groups(data, d => d.commit)
    .map(([commit, lines]) => {
      let { author, date, time, timezone, datetime } = lines[0];
      let ret = {
        id: commit,
        url: 'https://github.com/YOUR_REPO/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        writable: false,
        configurable: false,
        enumerable: false
      });
      return ret;
    });
}

function displayStats() {
  const container = d3.select('#stats').html("");
  container
    .style('max-width', '800px')
    .style('margin', '1em auto')
    .style('padding', '1em')
    .style('background-color', '#fdfdfd')
    .style('border', '1px solid #ccc')
    .style('border-radius', '5px')
    .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)');

  container.append('h2')
    .text('Summary Statistics')
    .style('text-align', 'center')
    .style('margin-bottom', '1em')
    .style('font-family', 'sans-serif');

  const flexContainer = container.append('div')
    .style('display', 'flex')
    .style('flex-wrap', 'wrap')
    .style('justify-content', 'space-around')
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
      .style('flex', '1 1 150px')
      .style('padding', '0.5em')
      .style('border', '1px solid #ddd')
      .style('border-radius', '3px')
      .style('background-color', '#fafafa')
      .style('text-align', 'center');

    statContainer.append('div')
      .text(stat.label)
      .style('font-weight', 'bold')
      .style('background-color', '#eee')
      .style('padding', '0.3em')
      .style('border-bottom', '1px solid #ddd');

    statContainer.append('div')
      .text(stat.value)
      .style('padding', '0.5em')
      .style('font-size', '1.2em');
  });
}

// ----- Tooltip functions -----

function updateTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (Object.keys(commit).length === 0) {
    link.href = "";
    link.textContent = "";
    date.textContent = "";
    author.textContent = "";
    lines.textContent = "";
    return;
  }

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
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
      d3.select(this)
        .classed('selected', true)
        .style('fill', 'orange');
    } else {
      d3.select(this)
        .classed('selected', false)
        .style('fill', 'steelblue');
    }
  });
}

function updateSelectionCount() {
  const selectedCommits = brushSelection ? commits.filter(isCommitSelected) : [];
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
  const selectedCommits = brushSelection ? commits.filter(isCommitSelected) : [];
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

function createScatterplot() {
  const container = d3.select('#chart');
  const containerWidth = container.node().clientWidth || 1000;
  const width = containerWidth;
  const height = width * (600 / 1000);
  const margin = { top: 10, right: 50, bottom: 30, left: 50 };
  const usableWidth = width - margin.left - margin.right;
  const usableHeight = height - margin.top - margin.bottom;
  
  const svg = container.append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('width', '100%')
    .style('height', 'auto')
    .style('overflow', 'visible');
  
  const xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([margin.left, width - margin.right])
    .nice();
  
  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);
  
  globalXScale = xScale;
  globalYScale = yScale;
  
  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines, maxLines])
    .range([2, 30]);
  
  const sortedCommits = d3.sort(commits, d => -d.totalLines);
  
  const gridlines = svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${margin.left}, 0)`);
  gridlines.call(
    d3.axisLeft(yScale)
      .tickFormat('')
      .tickSize(-usableWidth)
  );
  
  const dots = svg.append('g')
    .attr('class', 'dots');
  dots.selectAll('circle')
    .data(sortedCommits)
    .join('circle')
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
    .on('mouseleave', function (event) {
      d3.select(this).style('fill-opacity', 0.7);
      updateTooltipContent({});
      updateTooltipVisibility(false);
    });
  
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale)
    .tickFormat(d => d === 24 ? "24:00" : String(d).padStart(2, '0') + ':00');
  
  svg.append('g')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .call(xAxis);
  
  svg.append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(yAxis)
    .call(g => g.selectAll("text")
                .style("font-size", "12px")
                .style("fill", "black"));
  
  svg.append("line")
    .attr("x1", width - margin.right)
    .attr("y1", margin.top)
    .attr("x2", width - margin.right)
    .attr("y2", height - margin.bottom)
    .attr("stroke", "black")
    .attr("stroke-width", 1);
  
  const brush = d3.brush().on('start brush end', brushed);
  const brushGroup = svg.append('g').attr('class', 'brush-group');
  brushGroup.call(brush);
  brushGroup.selectAll('.overlay').attr('pointer-events', 'all').lower();
  svg.select('.dots').raise();
}

document.addEventListener('DOMContentLoaded', loadData);
