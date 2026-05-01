import { fetchJSON, renderProjects } from '../global.js';

const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');

try {
  const projects = await fetchJSON('../lib/projects.json');
  renderProjects(projects, projectsContainer, 'h2');

  if (projectsTitle) {
    projectsTitle.textContent = `Projects (${projects.length})`;
  }
} catch (error) {
  console.error(error);

  if (projectsContainer) {
    projectsContainer.innerHTML = '<p>Unable to load projects right now.</p>';
  }
}
