import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 375, height: 812, isMobile: true });

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  // Go to home to set localStorage
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  
  // Mock localStorage for supabase auth
  await page.evaluate(() => {
    localStorage.setItem('sb-supabase-auth-token', JSON.stringify({
      user: {
        id: '123',
        email: 'test@test.com',
        user_metadata: { role: 'admin' }
      },
      access_token: 'fake-token'
    }));
  });

  // Navigate to dashboard
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  const text = await page.evaluate(() => document.body.innerText);
  console.log("DASHBOARD TEXT:", text.substring(0, 500));
  
  await browser.close();
})();
