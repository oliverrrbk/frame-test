import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 375, height: 812, isMobile: true });

  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle0' });
  
  const rect = await page.evaluate(() => {
    const root = document.getElementById('root');
    const layout = document.querySelector('.dashboard-layout');
    const main = document.querySelector('.dashboard-main');
    const sidebar = document.querySelector('.dashboard-sidebar');
    const content = document.querySelector('.dashboard-content');
    
    return {
      root: root ? root.getBoundingClientRect() : null,
      layout: layout ? layout.getBoundingClientRect() : null,
      main: main ? main.getBoundingClientRect() : null,
      sidebar: sidebar ? sidebar.getBoundingClientRect() : null,
      content: content ? content.getBoundingClientRect() : null,
      html: document.documentElement.outerHTML.substring(0, 500)
    };
  });
  
  console.log(JSON.stringify(rect, null, 2));
  
  await browser.close();
})();
