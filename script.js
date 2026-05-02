const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");
const navLinks = document.querySelectorAll(".site-nav a");
const year = document.getElementById("year");
const settingsToggle = document.querySelector(".settings-toggle");
const settingsPanel = document.getElementById("settings-panel");
const themeButtons = document.querySelectorAll("[data-theme-option]");
const accentButtons = document.querySelectorAll("[data-accent-option]");

const THEME_KEY = "voroshilov-site-theme";
const ACCENT_KEY = "voroshilov-site-accent";
const defaultTheme = "light";
const defaultAccent = "orange";
const allowedAccents = new Set(["orange", "blue", "purple", "neon", "dark-yellow", "graphite"]);

function migrateLegacyThemeKeys() {
  try {
    if (localStorage.getItem(THEME_KEY) == null && localStorage.getItem("site-theme") != null) {
      localStorage.setItem(THEME_KEY, localStorage.getItem("site-theme"));
    }
    if (localStorage.getItem(ACCENT_KEY) == null && localStorage.getItem("site-accent") != null) {
      localStorage.setItem(ACCENT_KEY, localStorage.getItem("site-accent"));
    }
  } catch (error) {
    // ignore
  }
}

migrateLegacyThemeKeys();

function normalizeTheme(value) {
  return value === "dark" ? "dark" : "light";
}

function normalizeAccent(value) {
  if (value && allowedAccents.has(value)) return value;
  return defaultAccent;
}

function getStoredValue(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function setStoredValue(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // Ignore storage errors (private mode, blocked storage, etc.)
  }
}

/** Одна точка правды: тема и акцент только на <html>, без устаревших атрибутов на body */
function applyPreferences(theme, accent) {
  const t = normalizeTheme(theme);
  const a = normalizeAccent(accent);
  document.documentElement.dataset.theme = t;
  document.documentElement.dataset.accent = a;
  document.body.removeAttribute("data-theme");
  document.body.removeAttribute("data-accent");
  setStoredValue(THEME_KEY, t);
  setStoredValue(ACCENT_KEY, a);
  themeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.themeOption === t);
  });
  accentButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.accentOption === a);
  });
}

function setTheme(theme) {
  const accent =
    document.documentElement.dataset.accent || normalizeAccent(getStoredValue(ACCENT_KEY));
  applyPreferences(theme, accent);
}

function setAccent(accent) {
  const theme =
    document.documentElement.dataset.theme || normalizeTheme(getStoredValue(THEME_KEY));
  applyPreferences(theme, accent);
}

const savedTheme = normalizeTheme(getStoredValue(THEME_KEY) || defaultTheme);
const savedAccent = normalizeAccent(getStoredValue(ACCENT_KEY));
applyPreferences(savedTheme, savedAccent);

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
