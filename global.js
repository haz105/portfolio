console.log("IT’S ALIVE!");

const pages = [
  { url: "",               title: "Home" },
  { url: "contact/",       title: "Contact" },
  { url: "projects/",      title: "Projects" },
  { url: "https://github.com/haz105", title: "Profile" },
  { url: "resume.html",    title: "Resume" },
];

function inSubfolder() {
  return location.pathname.includes("/contact/") ||
         location.pathname.includes("/projects/");
}

const nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
  let { url, title } = p;

  if (inSubfolder() && !url.startsWith("http")) {
    url = "../" + url; 
  }

  const a = document.createElement("a");
  a.href = url;
  a.textContent = title;

  a.classList.toggle(
    "current",
    a.host === location.host && a.pathname === location.pathname
  );

  if (a.host !== location.host) {
    a.target = "_blank";
  }

  nav.append(a);
}




document.body.insertAdjacentHTML(
  "afterbegin",
  `
    <label class="color-scheme">
      Theme:
      <select id="theme-select">
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  `
);

const themeSelect = document.getElementById("theme-select");

if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
  themeSelect.value = localStorage.colorScheme;
}

themeSelect.addEventListener("input", function (event) {
  const newValue = event.target.value;
  setColorScheme(newValue);
  localStorage.colorScheme = newValue;
});

function setColorScheme(value) {
  document.documentElement.style.setProperty("color-scheme", value);
}

const form = document.querySelector("form");

form?.addEventListener("submit", function (event) {
  event.preventDefault();
  const data = new FormData(form);
  let url = form.action;
  let firstParam = true;

  for (let [name, value] of data) {
    const encodedValue = encodeURIComponent(value);
    url += firstParam ? "?" : "&";
    firstParam = false;
    url += name + "=" + encodedValue;
  }
  
  location.href = url;
});

export async function fetchJSON(url) {
  try {
      const response = await fetch(url);
      console.log(response);
      
      if (!response.ok) {
          throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
  } catch (error) {
      console.error('Error fetching or parsing JSON data:', error);
      return []; 
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!containerElement) {
    console.error('Invalid container element');
    return;
  }

  containerElement.innerHTML = '';

  if (!projects || projects.length === 0) {
    containerElement.innerHTML = '<p>No projects found.</p>';
    return;
  }

  projects.forEach(project => {
    const article = document.createElement('article');
    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img src="${project.image}" alt="${project.title}">
      <div class="project-details">
        <p class="description">${project.description}</p>
        <p class="year">Year: ${project.year}</p>
      </div>
    `;
    containerElement.appendChild(article);
  });
}



export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}

