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

