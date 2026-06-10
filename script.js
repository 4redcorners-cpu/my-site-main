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
    const isActive = button.dataset.themeOption === t;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  accentButtons.forEach((button) => {
    const isActive = button.dataset.accentOption === a;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
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

function normalizePath(pathname) {
  return pathname.replace(/\/index\.html$/, "").replace(/\/$/, "") || "/";
}

const currentPath = normalizePath(window.location.pathname);
navLinks.forEach((link) => {
  const linkUrl = new URL(link.getAttribute("href"), window.location.href);
  const linkPath = normalizePath(linkUrl.pathname);
  const linkPage = linkUrl.pathname.split("/").pop() || "index.html";
  const isCurrentPage = linkPath === currentPath;
  const isLandingServicePage = document.body.classList.contains("landing-page") && linkPage === "services.html";
  if (isCurrentPage || isLandingServicePage) {
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

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (menuButton && nav && nav.classList.contains("is-open")) {
    menuButton.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
  }

  if (settingsToggle && settingsPanel && !settingsPanel.hidden) {
    settingsPanel.hidden = true;
    settingsToggle.setAttribute("aria-expanded", "false");
    settingsToggle.focus();
  }
});

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

/* Аурора: не крутить keyframes, пока секция не в зоне видимости — меньше нагрузка на GPU */
(function initAuroraVisibilityPause() {
  const sections = document.querySelectorAll(
    "section#about.section-light-pillar, section#directions.section-light-pillar, section#process.section-light-pillar",
  );
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ioOk = typeof IntersectionObserver !== "undefined";
  if (!sections.length || !ioOk) return;
  if (reduced) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("section-light-pillar--aurora-off", !entry.isIntersecting);
      });
    },
    { rootMargin: "100px 0px", threshold: 0 },
  );

  sections.forEach((el) => {
    el.classList.add("section-light-pillar--aurora-off");
    observer.observe(el);
  });
})();
