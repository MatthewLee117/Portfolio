<<<<<<< HEAD
console.log("IT'S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "resume/?v=2", title: "Resume" },
  { url: "https://github.com/matthewlee", title: "GitHub" },
];

const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/Portfolio/";

const colorSchemeLabel = document.createElement("label");
colorSchemeLabel.className = "color-scheme";
const colorSchemeSelect = document.createElement("select");

const colorSchemeOptions = [
  { value: "light dark", label: "Automatic" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

for (const option of colorSchemeOptions) {
  const optionElement = document.createElement("option");
  optionElement.value = option.value;
  optionElement.textContent = option.label;
  colorSchemeSelect.append(optionElement);
}

function setColorScheme(colorScheme) {
  document.documentElement.style.colorScheme = colorScheme;
  colorSchemeSelect.value = colorScheme;
}

function getSavedColorScheme() {
  try {
    return localStorage.getItem("colorScheme");
  } catch (error) {
    console.warn("Could not read localStorage:", error);
    return null;
  }
}

function saveColorScheme(colorScheme) {
  try {
    localStorage.setItem("colorScheme", colorScheme);
  } catch (error) {
    console.warn("Could not write localStorage:", error);
  }
}

const savedColorScheme = getSavedColorScheme();
setColorScheme(savedColorScheme || "light dark");

colorSchemeSelect.addEventListener("input", (event) => {
  const selectedScheme = event.target.value;
  setColorScheme(selectedScheme);
  saveColorScheme(selectedScheme);
});

colorSchemeLabel.append("Theme: ", colorSchemeSelect);

const nav = document.createElement("nav");
document.body.prepend(colorSchemeLabel, nav);

for (const p of pages) {
  let url = p.url;
  const title = p.title;

  if (!url.startsWith("http")) {
    url = BASE_PATH + url;
  }

  const a = document.createElement("a");
  a.href = url;
  a.textContent = title;

  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add("current");
  }

  if (a.host !== location.host) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }

  nav.append(a);
}
=======
export async function fetchJSON(url) {
  let response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`Network error while fetching ${url}: ${error.message}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(`Invalid JSON at ${url}: ${error.message}`);
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!Array.isArray(projects)) {
    throw new Error('renderProjects expected an array of projects.');
  }

  if (!(containerElement instanceof Element)) {
    throw new Error('renderProjects expected a valid container element.');
  }

  const allowedHeading = /^h[1-6]$/i.test(headingLevel) ? headingLevel.toLowerCase() : 'h2';

  containerElement.innerHTML = '';

  for (const project of projects) {
    const article = document.createElement('article');

    article.innerHTML = `
      <${allowedHeading}>${project.title ?? 'Untitled Project'}</${allowedHeading}>
      <img src="${project.image ?? ''}" alt="${project.title ?? 'Project image'}">
      <p>${project.description ?? 'No description available.'}</p>
      ${project.year ? `<p><strong>Year:</strong> ${project.year}</p>` : ''}
    `;

    containerElement.appendChild(article);
  }
}

export async function fetchGitHubData(username) {
  if (!username) {
    throw new Error('fetchGitHubData requires a username.');
  }

  return fetchJSON(`https://api.github.com/users/${username}`);
}

export const fetchGithubData = fetchGitHubData;
>>>>>>> 7eee42a (lab 4)
