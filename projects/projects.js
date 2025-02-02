import { fetchJSON, renderProjects } from '../global.js';

async function initProjects() {
    try {
        const projects = await fetchJSON('../lib/projects.json');
        const projectsContainer = document.querySelector('.projects');
        const titleElement = document.querySelector('h1');
        
        if (titleElement && projects.length > 0) {
            titleElement.textContent += ` (${projects.length})`;
        }
        
        renderProjects(projects, projectsContainer, 'h2');
    } catch (error) {
        console.error('Error initializing projects:', error);
    }
}

initProjects();