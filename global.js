console.log("IT’S ALIVE!");

// 1. Build the NAV
const pages = [
  { url: "",                    title: "Home" },
  { url: "contact/",            title: "Contact" },
  { url: "projects/",           title: "Projects" },
  { url: "https://github.com/haz105", title: "Profile" },
  { url: "resume.html",         title: "Resume" },
];

// Count how many segments are in the path
function getPathDepth() {
  // e.g. /myrepo/contact/index.html => ["myrepo","contact","index.html"] => length=3
  // e.g. /resume.html => ["resume.html"] => length=1
  return location.pathname.split("/").filter(Boolean).length;
}

const depth = getPathDepth();

// 2. Create nav
const nav = document.createElement("nav");
document.body.prepend(nav);

// 3. Populate nav
for (let p of pages) {
  let { url, title } = p;

  // If we’re at least 1 folder deep AND this is a relative link...
  if (depth > 1 && !url.startsWith("http")) {
    // We need 'depth - 1' times "../" to get back to the correct level
    let backSteps = depth - 1; 
    let prefix = "../".repeat(backSteps);
    url = prefix + url;
  }

  // Create link
  let a = document.createElement("a");
  a.href = url;
  a.textContent = title;

  // Highlight current page
  a.classList.toggle(
    "current",
    a.host === location.host && a.pathname === location.pathname
  );

  // External links => open in new tab
  if (a.host !== location.host) {
    a.target = "_blank";
  }

  nav.append(a);
}


// 2. Insert THEME SWITCH
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

// Reference the <select> we just made
const themeSelect = document.getElementById("theme-select");

// If localStorage has a saved colorScheme, use it
if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
  themeSelect.value = localStorage.colorScheme;
}

// Listen for user changes
themeSelect.addEventListener("input", function (event) {
  const newValue = event.target.value;
  setColorScheme(newValue);
  localStorage.colorScheme = newValue;
});

// Helper to set color-scheme style on <html>
function setColorScheme(value) {
  // e.g. documentElement.style.colorScheme = "dark";
  document.documentElement.style.setProperty("color-scheme", value);
}

// 3. Better Contact Form Handling (Optional Step)
const form = document.querySelector("form");

/* 
  Only add a submit listener if there's actually a <form> on this page.
  That way we don’t get errors on pages without a form.
*/
form?.addEventListener("submit", function (event) {
  // 1) Prevent the normal behavior (which would produce + signs)
  event.preventDefault();

  // 2) Get the form data
  const data = new FormData(form);

  // 3) Start building the mailto URL
  //    e.g. mailto:someone@example.com
  //    We get the base (e.g. "mailto:haz105@ucsd.edu") from the form's action.
  let url = form.action; // "mailto:haz105@ucsd.edu"

  // We'll add "?" and then key=value pairs (like subject=Hello&body=Hi+there)
  // but we'll encode them properly with encodeURIComponent().
  let firstParam = true;

  // For each form field
  for (let [name, value] of data) {
    // Encode the value so spaces become %20, not +
    const encodedValue = encodeURIComponent(value);

    // For the first parameter, add a "?" after the mailto:
    // For subsequent parameters, add an "&" instead
    url += firstParam ? "?" : "&";
    firstParam = false;

    // Build "subject=EncodedValue" or "body=EncodedValue"
    url += name + "=" + encodedValue;
  }

  // 4) Open the mailto URL to launch the email client
  location.href = url;
});

