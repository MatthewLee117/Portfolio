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

function getFilteredProjects() {
  let filtered = allProjects.filter((project) => projectMatchesQuery(project, query));

  if (selectedYear !== null) {
    filtered = filtered.filter((project) => String(project.year) === selectedYear);
  }

  return filtered;
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
  const filteredProjects = getFilteredProjects();

  renderProjects(filteredProjects, projectsContainer, 'h2');

  if (projectsTitle) {
    projectsTitle.textContent = `Projects (${filteredProjects.length})`;
  }

  renderPieChart(filteredProjects);
}

try {
  allProjects = await fetchJSON('../lib/projects.json');

  updateUI();

  searchInput?.addEventListener('input', (event) => {
    query = event.target.value.trim();
    selectedYear = null;
    updateUI();
  });
} catch (error) {
  console.error(error);

  if (projectsContainer) {
    projectsContainer.innerHTML = '<p>Unable to load projects right now.</p>';
  }
}
