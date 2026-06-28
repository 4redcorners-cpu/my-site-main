(function initSiteIcons() {
  function resolveIconUrl(id) {
    const brandLink = document.querySelector(".site-header .brand");
    const baseHref = brandLink?.getAttribute("href") || "index.html";
    const siteRoot = new URL("./", new URL(baseHref, window.location.href));
    return new URL(`assets/icons/${id}.png`, siteRoot).href;
  }

  function upgradeSiteIcons(scope) {
    const container = scope && scope.querySelectorAll ? scope : document;
    container.querySelectorAll("svg.icon").forEach((svg) => {
      const use = svg.querySelector("use");
      const raw = use?.getAttribute("href") || use?.getAttribute("xlink:href") || "";
      const id = raw.replace("#", "");
      if (!id) return;

      const span = document.createElement("span");
      span.className = `${svg.className.toString().trim()} icon-mask`.trim();
      span.setAttribute("aria-hidden", "true");
      const url = resolveIconUrl(id);
      span.style.maskImage = `url("${url}")`;
      span.style.webkitMaskImage = `url("${url}")`;
      svg.replaceWith(span);
    });
  }

  window.upgradeSiteIcons = upgradeSiteIcons;

  function boot() {
    upgradeSiteIcons();
    const serviceRoot = document.getElementById("service-page-root");
    if (serviceRoot && typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver(() => upgradeSiteIcons(serviceRoot));
      observer.observe(serviceRoot, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
