import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');
const svg = d3.select('#projects-pie-chart');
const legend = d3.select('.legend');

let allProjects = [];
let query = '';
let selectedYear = null;

function projectMatchesQuery(project, queryText) {
  const values = Object.values(project).join('\n').toLowerCase();
  return values.includes(queryText.toLowerCase());
}

function getQueryFilteredProjects() {
  return allProjects.filter((project) => projectMatchesQuery(project, query));
}

function renderPieChart(projectsGiven) {
  const rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => String(d.year),
  );

  const data = rolledData
    .map(([year, count]) => ({ value: count, label: year }))
    .sort((a, b) => Number(a.label) - Number(b.label));

  const colors = d3.scaleOrdinal(d3.schemeTableau10).domain(data.map((d) => d.label));

  const pie = d3.pie().value((d) => d.value);
  const arcData = pie(data);
  const arc = d3.arc().innerRadius(0).outerRadius(45);

  svg.selectAll('path').remove();

  svg
    .selectAll('path')
    .data(arcData)
    .join('path')
    .attr('d', arc)
    .attr('fill', (d) => colors(d.data.label))
    .classed('selected', (d) => d.data.label === selectedYear)
    .on('click', (_event, d) => {
      selectedYear = selectedYear === d.data.label ? null : d.data.label;
      updateUI();
    });

  legend.selectAll('li').remove();

  legend
    .selectAll('li')
    .data(data)
    .join('li')
    .attr('style', (d) => `--color:${colors(d.label)}`)
    .classed('selected', (d) => d.label === selectedYear)
    .html((d) => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
    .on('click', (_event, d) => {
      selectedYear = selectedYear === d.label ? null : d.label;
      updateUI();
    });
}

function updateUI() {
  const queryFilteredProjects = getQueryFilteredProjects();
  const selectedYearStillVisible =
    selectedYear !== null && queryFilteredProjects.some((p) => String(p.year) === selectedYear);

  if (!selectedYearStillVisible) {
    selectedYear = null;
  }

  const displayedProjects =
    selectedYear === null
      ? queryFilteredProjects
      : queryFilteredProjects.filter((project) => String(project.year) === selectedYear);

  renderProjects(displayedProjects, projectsContainer, 'h2');

  if (projectsTitle) {
    projectsTitle.textContent = `Projects (${displayedProjects.length})`;
  }

  // Keep the pie based on search-visible projects so users can switch year selections.
  renderPieChart(queryFilteredProjects);
}

try {
  allProjects = await fetchJSON('../lib/projects.json');

  updateUI();

  searchInput?.addEventListener('input', (event) => {
    query = event.target.value.trim();
    updateUI();
  });
} catch (error) {
  console.error(error);

  if (projectsContainer) {
    projectsContainer.innerHTML = '<p>Unable to load projects right now.</p>';
  }
}
