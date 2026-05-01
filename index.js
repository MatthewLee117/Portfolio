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
      <div class="github-stats-grid">
        <article class="github-stat"><h3>Public Repos</h3><p>${githubData.public_repos}</p></article>
        <article class="github-stat"><h3>Public Gists</h3><p>${githubData.public_gists}</p></article>
        <article class="github-stat"><h3>Followers</h3><p>${githubData.followers}</p></article>
        <article class="github-stat"><h3>Following</h3><p>${githubData.following}</p></article>
      </div>
    `;
  }
} catch (error) {
  console.error(error);

  if (profileStats) {
    profileStats.textContent = 'Unable to load GitHub stats right now.';
  }
}
