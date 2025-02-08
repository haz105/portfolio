import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// Global state for filtering:
let originalProjects = [];  // full dataset
let currentQuery = '';        // search query (lowercased)
let currentYear = '';         // selected year (as a string), or empty if none

// Global references for our full (unchanged) pie chart:
let globalPieData = [];  // Array of objects: { value, label }
let svgGlobal = null;
let legendGlobal = null;

// Cache the projects container globally
const projectsContainer = document.querySelector('.projects');

// -----------------------------
// Function: updateProjectsList
// -----------------------------
// Filters the full projects data using the current search query and/or selected year,
// then renders the projects list.
function updateProjectsList() {
  let filtered = originalProjects.filter(project => {
    const values = Object.values(project).join('\n').toLowerCase();
    return values.includes(currentQuery);
  });
  if (currentYear !== '') {
    filtered = filtered.filter(project => project.year === currentYear);
  }
  renderProjects(filtered, projectsContainer, 'h2');
}

// -----------------------------
// Function: renderPieChartFull
// -----------------------------
// Renders the full pie chart and legend once, using the full dataset.
// This chart remains unchanged (it always shows all years) and is used as a filtering UI.
function renderPieChartFull() {
  // Group projects by year using d3.rollups()
  const rolledData = d3.rollups(
    originalProjects,
    v => v.length,
    d => d.year
  );
  
  // Create an array of objects with { value, label }
  globalPieData = rolledData.map(([year, count]) => ({ value: count, label: year }));
  
  // Create a pie layout using the value property.
  const sliceGenerator = d3.pie().value(d => d.value);
  const arcData = sliceGenerator(globalPieData);
  
  // Create an arc generator for a full pie (innerRadius 0).
  const arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);
  
  // Color scale for slices.
  const colors = d3.scaleOrdinal(d3.schemeTableau10);
  
  // Select the SVG element and clear any previous content.
  svgGlobal = d3.select('#projects-pie-plot');
  svgGlobal.selectAll('path').remove();
  
  // Select the legend and clear any previous entries.
  legendGlobal = d3.select('.legend');
  legendGlobal.selectAll('li').remove();
  
  // For each slice, append a path with interactivity.
  arcData.forEach((d, idx) => {
    svgGlobal.append('path')
      .attr('d', arcGenerator(d))
      .attr('fill', colors(idx))
      .attr('cursor', 'pointer')
      .on('click', () => {
        const clickedYear = globalPieData[idx].label;
        // Toggle the selected year.
        currentYear = (currentYear === clickedYear ? '' : clickedYear);
        updateSelectionStyles();
        updateProjectsList();
      });
  });
  
  // For each data entry, append a legend item with interactivity.
  globalPieData.forEach((d, idx) => {
    legendGlobal.append('li')
      .attr('style', `--color:${colors(idx)}`)
      .attr('class', 'legend-item')
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .attr('cursor', 'pointer')
      .on('click', () => {
        const clickedYear = d.label;
        currentYear = (currentYear === clickedYear ? '' : clickedYear);
        updateSelectionStyles();
        updateProjectsList();
      });
  });
}

// -----------------------------
// Helper: updateSelectionStyles
// -----------------------------
// Updates the CSS classes on the pie chart wedges and legend items so that
// the wedge (and legend item) matching currentYear gets a 'selected' class.
function updateSelectionStyles() {
  // Update the SVG wedges.
  svgGlobal.selectAll('path')
    .attr('class', (d, i) => {
      return globalPieData[i].label === currentYear ? 'selected' : '';
    });
  
  // Update the legend items.
  legendGlobal.selectAll('li')
    .attr('class', (d, i) => {
      return globalPieData[i].label === currentYear ? 'legend-item selected' : 'legend-item';
    });
}

// -----------------------------
// Initialization
// -----------------------------
async function initProjects() {
  try {
    // 1. Fetch all projects from your JSON file.
    const projects = await fetchJSON('../lib/projects.json');
    originalProjects = projects; // Store the full dataset globally

    const titleElement = document.querySelector('h1');
    if (titleElement && projects.length > 0) {
      titleElement.textContent += ` (${projects.length})`;
    }
    
    // Render the full pie chart once.
    renderPieChartFull();
    // Render the projects list initially (with no filters).
    updateProjectsList();
    
    // 2. Set up the search bar for real-time filtering.
    const searchInput = document.querySelector('.searchBar');
    searchInput.addEventListener('input', (event) => {
      currentQuery = event.target.value.trim().toLowerCase();
      updateProjectsList();
    });
    
  } catch (error) {
    console.error('Error initializing projects:', error);
  }
}

initProjects();
