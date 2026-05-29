import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Sæt viewport til mobil
  await page.setViewport({ width: 375, height: 812, isMobile: true });

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  console.log("Navigating to http://localhost:5173/dashboard ...");
  try {
    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle0', timeout: 10000 });
  } catch (e) {
    console.log("Navigation timeout or error:", e.message);
  }
  
  await browser.close();
})();
