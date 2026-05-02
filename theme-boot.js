(function () {
  try {
    var THEME_KEY = "voroshilov-site-theme";
    var ACCENT_KEY = "voroshilov-site-accent";
    var LEGACY_THEME = "site-theme";
    var LEGACY_ACCENT = "site-accent";
    var ACCENTS = { orange: 1, blue: 1, purple: 1, neon: 1, "dark-yellow": 1, graphite: 1 };

    function pick(key, legacy) {
      var v = localStorage.getItem(key);
      if (v != null && v !== "") return v;
      if (legacy) {
        var old = localStorage.getItem(legacy);
        if (old != null && old !== "") {
          try {
            localStorage.setItem(key, old);
          } catch (e) {}
          return old;
        }
      }
      return null;
    }

    function normalizeTheme(value) {
      return value === "dark" ? "dark" : "light";
    }

    function normalizeAccent(value) {
      if (value && ACCENTS[value]) return value;
      return "orange";
    }

    var rawTheme = pick(THEME_KEY, LEGACY_THEME);
    var rawAccent = pick(ACCENT_KEY, LEGACY_ACCENT);
    var theme = normalizeTheme(rawTheme || "light");
    var accent = normalizeAccent(rawAccent);

    var root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.accent = accent;
  } catch (e) {}
})();
