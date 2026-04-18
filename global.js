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

const savedColorScheme = localStorage.getItem("colorScheme");
setColorScheme(savedColorScheme || "light dark");

colorSchemeSelect.addEventListener("input", (event) => {
  const selectedScheme = event.target.value;
  setColorScheme(selectedScheme);
  localStorage.setItem("colorScheme", selectedScheme);
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
