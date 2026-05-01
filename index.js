import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

const projectsContainer = document.querySelector('.projects');

try {
  const projects = await fetchJSON('./lib/projects.json');
  const latestProjects = projects.slice(0, 3);

  if (projectsContainer) {
    renderProjects(latestProjects, projectsContainer, 'h2');
  }
} catch (error) {
  console.error(error);

  if (projectsContainer) {
    projectsContainer.innerHTML = '<p>Unable to load latest projects.</p>';
  }
}

const profileStats = document.querySelector('#profile-stats');

try {
  const githubData = await fetchGitHubData('MatthewLee117');

  if (profileStats) {
    profileStats.innerHTML = `
      <dl>
        <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
        <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
        <dt>Followers:</dt><dd>${githubData.followers}</dd>
        <dt>Following:</dt><dd>${githubData.following}</dd>
      </dl>
    `;
  }
} catch (error) {
  console.error(error);

  if (profileStats) {
    profileStats.textContent = 'Unable to load GitHub stats right now.';
  }
}
