const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");
const navLinks = document.querySelectorAll(".site-nav a");
const year = document.getElementById("year");
const settingsToggle = document.querySelector(".settings-toggle");
const settingsPanel = document.getElementById("settings-panel");
const themeButtons = document.querySelectorAll("[data-theme-option]");
const accentButtons = document.querySelectorAll("[data-accent-option]");

const THEME_KEY = "site-theme";
const ACCENT_KEY = "site-accent";
const defaultTheme = "light";
const defaultAccent = "blue";

function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  themeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.themeOption === theme);
  });
}

function setAccent(accent) {
  document.body.dataset.accent = accent;
  localStorage.setItem(ACCENT_KEY, accent);
  accentButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.accentOption === accent);
  });
}

setTheme(localStorage.getItem(THEME_KEY) || defaultTheme);
setAccent(localStorage.getItem(ACCENT_KEY) || defaultAccent);

const currentPage = window.location.pathname.split("/").pop() || "index.html";
navLinks.forEach((link) => {
  const linkPage = link.getAttribute("href");
  if (linkPage === currentPage) {
    link.classList.add("is-active");
    link.setAttribute("aria-current", "page");
  }
});

if (year) {
  year.textContent = new Date().getFullYear();
}

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const isExpanded = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isExpanded));
    nav.classList.toggle("is-open", !isExpanded);
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      menuButton.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
    });
  });
}

if (settingsToggle && settingsPanel) {
  settingsToggle.addEventListener("click", () => {
    const isExpanded = settingsToggle.getAttribute("aria-expanded") === "true";
    settingsToggle.setAttribute("aria-expanded", String(!isExpanded));
    settingsPanel.hidden = isExpanded;
  });

  document.addEventListener("click", (event) => {
    if (!settingsPanel.hidden && !settingsPanel.contains(event.target) && !settingsToggle.contains(event.target)) {
      settingsPanel.hidden = true;
      settingsToggle.setAttribute("aria-expanded", "false");
    }
  });
}

themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setTheme(button.dataset.themeOption);
  });
});

accentButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setAccent(button.dataset.accentOption);
  });
});
