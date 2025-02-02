import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

async function initLatestProjects() {
  try {
    const projects = await fetchJSON('lib/projects.json');

    const latestProjects = projects.slice(0, 3);

    const projectsContainer = document.querySelector('.projects');
    if (!projectsContainer) {
      console.error("Projects container not found. Ensure your HTML has an element with the class 'projects'.");
      return;
    }

    renderProjects(latestProjects, projectsContainer, 'h2');
  } catch (error) {
    console.error('Error fetching or rendering the latest projects:', error);
  }
}

initLatestProjects();

async function initGitHubStats() {
  try {
    const githubData = await fetchGitHubData('haz105');
    console.log('GitHub data:', githubData);
    const githubContainer = document.querySelector('.github-stats');
    if (githubContainer) {
      githubContainer.innerHTML = `
        <h2>GitHub Stats</h2>
        <dl class="github-stats-grid">
          <dt>Followers</dt>
          <dd>${githubData.followers}</dd>
          <dt>Following</dt>
          <dd>${githubData.following}</dd>
          <dt>Public Repos</dt>
          <dd>${githubData.public_repos}</dd>
          <dt>Public Gists</dt>
          <dd>${githubData.public_gists}</dd>
        </dl>
      `;
    }
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
  }
}

initGitHubStats();
