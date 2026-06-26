(function renderSiteFooter() {
  const footer = document.getElementById("site-footer") || document.querySelector(".site-footer");
  if (!footer) return;

  const brandLink = document.querySelector(".site-header .brand");
  const root = brandLink ? brandLink.getAttribute("href").replace(/index\.html$/, "") : "";

  const NAV = [
    { title: "Обо мне", href: "index.html" },
    { title: "Услуги", href: "services.html" },
    { title: "Портфолио", href: "works.html" },
    { title: "Стоимость", href: "cost.html" },
    { title: "Контакты", href: "contacts.html" },
  ];

  const DEFAULT_SERVICES = [
    { slug: "vibe-coding", title: "Вайб-кодинг" },
    { slug: "sites", title: "Сайты и лендинги" },
    { slug: "shop", title: "Интернет-магазины" },
    { slug: "android", title: "Android-приложения" },
    { slug: "prototypes", title: "Прототипы и MVP" },
    { slug: "web-design", title: "Web-дизайн" },
    { slug: "copywriting", title: "Продающие тексты" },
    { slug: "prompts", title: "Промпты для нейросетей" },
    { slug: "ai-assistants", title: "ИИ-помощники" },
  ];

  const SOCIALS = [
    { href: "mailto:rednine@ya.ru", label: "Написать на почту rednine@ya.ru", icon: "contact-email.png" },
    { href: "https://vk.com/voroshilovevgeny", label: "ВКонтакте", icon: "contact-vk.png", external: true },
    {
      href: "https://max.ru/u/f9LHodD0cOLtBTAtkMWYJZFcamuwqAwYcvVHDooAM1fEtYRtKJqG86VoRUI",
      label: "MAX",
      icon: "contact-max.png",
      external: true,
    },
    { href: "https://t.me/evgenivoroshilov", label: "Telegram", icon: "contact-telegram.png", external: true },
  ];

  const services = Array.isArray(window.serviceDirections) ? window.serviceDirections : DEFAULT_SERVICES;

  const navLinks = NAV.map(
    (item) => `<li><a href="${root}${item.href}">${item.title}</a></li>`,
  ).join("");

  const serviceLinks = services
    .map(
      (service) =>
        `<li><a href="${root}services/${service.slug}/index.html">${service.title}</a></li>`,
    )
    .join("");

  const socialLinks = SOCIALS.map((item) => {
    const external = item.external ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `
      <a class="social-link social-link--icon-only" href="${item.href}"${external} aria-label="${item.label}">
        <span class="contact-icon contact-icon--logo" aria-hidden="true">
          <img src="${root}assets/${item.icon}" alt="" width="36" height="36" decoding="async">
        </span>
      </a>
    `;
  }).join("");

  footer.innerHTML = `
    <div class="container footer-grid">
      <nav class="footer-col" aria-label="Навигация по сайту">
        <p class="footer-col-title">Меню</p>
        <ul class="footer-links-list">${navLinks}</ul>
      </nav>
      <nav class="footer-col" aria-label="Услуги">
        <p class="footer-col-title">Услуги</p>
        <ul class="footer-links-list">${serviceLinks}</ul>
      </nav>
      <div class="footer-col footer-social-col">
        <p class="footer-col-title">Соцсети</p>
        <div class="footer-social">${socialLinks}</div>
      </div>
      <div class="footer-copy">© <span id="year"></span> Евгений Ворошилов. Все права защищены.</div>
    </div>
  `;
})();
