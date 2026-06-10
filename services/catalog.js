(function renderServicesCatalog() {
  const container = document.getElementById("services-catalog");
  if (!container || !Array.isArray(window.serviceDirections)) return;

  container.innerHTML = window.serviceDirections
    .map((service) => {
      const href = `services/${service.slug}/index.html`;
      return `
        <article class="catalog-card">
          <a class="catalog-card__media" href="${href}" aria-label="${service.title}">
            <img src="${service.image}" alt="" loading="lazy" decoding="async">
          </a>
          <div class="catalog-card__body">
            <h3>${service.title}</h3>
            <p>${service.short}</p>
          </div>
          <a class="btn btn-primary" href="${href}">Подробнее</a>
        </article>
      `;
    })
    .join("");
})();
