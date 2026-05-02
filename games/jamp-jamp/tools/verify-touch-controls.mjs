/**
 * Проверка: в эмуляции телефона/планшета панель #mobileControls видна,
 * position: fixed у нижнего края, тапы по кнопкам не падают с ошибкой.
 * Запуск: из каталога jamp-jamp поднять сервер и выполнить
 *   BASE_URL=http://127.0.0.1:8765 node tools/verify-touch-controls.mjs
 */
import { chromium, devices } from "playwright";

const baseURL = process.env.BASE_URL || "http://127.0.0.1:8765";

async function delay(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function checkDock(page, label) {
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e.message)));

  const dock = page.locator("#mobileControls");
  await dock.waitFor({ state: "visible", timeout: 10000 });

  const styles = await dock.evaluate((el) => {
    const s = window.getComputedStyle(el);
    return {
      display: s.display,
      position: s.position,
      bottom: s.bottom,
    };
  });

  const box = await dock.boundingBox();
  const vh = await page.evaluate(() => window.innerHeight);

  if (styles.display !== "flex") {
    throw new Error(`${label}: ожидался display:flex, получено ${styles.display}`);
  }
  if (styles.position !== "fixed") {
    throw new Error(`${label}: ожидался position:fixed, получено ${styles.position}`);
  }
  if (!box) {
    throw new Error(`${label}: нет boundingBox у #mobileControls`);
  }
  if (box.y + box.height > vh + 3) {
    throw new Error(
      `${label}: панель выходит за нижний край окна (bottom ${box.y + box.height}, vh ${vh})`,
    );
  }

  await page.locator("#mcJump").tap();
  await page.locator("#mcLeft").tap();
  await page.locator("#mcRight").tap();
  await delay(200);

  if (pageErrors.length) {
    throw new Error(`${label}: ошибки страницы: ${pageErrors.join("; ")}`);
  }

  console.log(`${label}: dock OK (fixed bottom, тапы без падений)`);
}

async function runWithDevice(name, deviceOptions) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...deviceOptions,
    hasTouch: true,
  });
  const page = await context.newPage();

  await page.goto(`${baseURL}/index.html`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#game");

  await checkDock(page, name);
  await browser.close();
}

async function main() {
  const phone = devices["iPhone 13"];
  const tablet = devices["iPad Pro 11"];
  if (!phone || !tablet) {
    throw new Error("В этом билде Playwright нет нужных preset устройств");
  }

  await runWithDevice("iPhone 13 (портрет)", phone);
  await runWithDevice("iPad Pro 11 (портрет)", tablet);

  console.log("\nГотово: проверки для телефона и планшета прошли.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
