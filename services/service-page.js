(function renderServicePage() {
  const root = document.getElementById("service-page-root");
  const services = window.serviceDirections || [];
  if (!root || !services.length) return;

  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const lastPart = pathParts[pathParts.length - 1];
  const pathSlug = lastPart === "index.html" ? pathParts[pathParts.length - 2] : lastPart;
  const slug = document.body.dataset.serviceSlug || pathSlug;
  const service = services.find((item) => item.slug === slug);

  if (!service) {
    document.title = "Услуга не найдена — Евгений Ворошилов";
    root.innerHTML = `
      <section class="section landing-hero">
        <div class="container">
          <p class="eyebrow">Услуги</p>
          <h1>Услуга не найдена</h1>
          <p class="lead">Вернитесь к каталогу направлений и выберите нужную страницу.</p>
          <div class="cta-row">
            <a class="btn btn-primary" href="../../services.html">К списку услуг</a>
          </div>
        </div>
      </section>
    `;
    return;
  }

  const description = service.intro[0].slice(0, 155);
  document.title = `${service.pageTitle} — Евгений Ворошилов`;
  setMeta("description", description);
  setMeta("og:title", `${service.pageTitle} — Евгений Ворошилов`);
  setMeta("og:description", description);
  setMeta("og:url", `https://4redcorners-cpu.github.io/my-site-main/services/${service.slug}/`);
  setCanonical(`https://4redcorners-cpu.github.io/my-site-main/services/${service.slug}/`);

  root.innerHTML = `
    <section class="section landing-hero">
      <div class="container landing-hero-grid">
        <div class="landing-hero-copy">
          <h1>${service.pageTitle}</h1>
          ${service.intro.map((paragraph) => `<p>${paragraph}</p>`).join("")}
          <div class="cta-row">
            <a class="btn btn-primary" href="../../contacts.html">Обсудить проект</a>
            <a class="btn btn-secondary" href="../../services.html">К списку услуг</a>
          </div>
        </div>
        <aside class="landing-summary-card" aria-label="Кратко о направлении">
          <span class="icon-box icon-box--large"><svg class="icon"><use href="#${service.icon}"></use></svg></span>
          <h2>${service.title}</h2>
          <ul>
            <li><svg class="icon"><use href="#icon-check"></use></svg>Что входит в работу</li>
            <li><svg class="icon"><use href="#icon-check"></use></svg>${service.benefitTitle}</li>
            <li><svg class="icon"><use href="#icon-check"></use></svg>Как проходит работа</li>
            <li><svg class="icon"><use href="#icon-check"></use></svg>Результат</li>
          </ul>
        </aside>
      </div>
    </section>

    <section class="section landing-details">
      <div class="container">
        <div class="section-heading section-heading--wide">
          <h2>Что входит в работу</h2>
          <p class="section-intro">Основные части работы по направлению собраны в короткий список, чтобы быстро понять объём.</p>
        </div>
        <div class="include-grid">
          ${service.includes.map((item) => `
            <div class="include-item">
              <svg class="icon"><use href="#icon-check"></use></svg>
              <span>${item}</span>
            </div>
          `).join("")}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container landing-card-grid">
        ${renderTextCard(service.icon, service.benefitTitle, service.benefit)}
        ${renderTextCard("icon-target", "Как проходит работа", service.process)}
        ${renderTextCard("icon-check", "Результат", service.result)}
      </div>
    </section>

    <section class="section landing-final">
      <div class="container">
        <div class="landing-final-panel">
          <span class="icon-box"><svg class="icon"><use href="#${service.icon}"></use></svg></span>
          <h2>${service.cta}</h2>
          <p>Если это направление подходит вашей задаче, напишите мне. Разберём идею, формат и первый понятный шаг.</p>
          <div class="cta-row centered">
            <a class="btn btn-invert" href="../../contacts.html">Обсудить проект</a>
            <a class="btn btn-secondary" href="../../services.html">К списку услуг</a>
          </div>
        </div>
      </div>
    </section>
  `;
})();

function renderTextCard(icon, title, paragraphs) {
  return `
    <article class="landing-card">
      <span class="icon-box"><svg class="icon"><use href="#${icon}"></use></svg></span>
      <h2>${title}</h2>
      ${paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}
    </article>
  `;
}

function setMeta(name, value) {
  const selector = name.startsWith("og:") ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  const meta = document.querySelector(selector);
  if (meta) meta.setAttribute("content", value);
}

function setCanonical(value) {
  const link = document.querySelector('link[rel="canonical"]');
  if (link) link.setAttribute("href", value);
}
