const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('response', response => console.log('PAGE RESPONSE:', response.status(), response.url()));
  page.on('requestfailed', request => console.log('PAGE REQUEST FAILED:', request.failure().errorText, request.url()));

  await page.goto('http://localhost:3002');
  
  await page.waitForSelector('input[placeholder="Kullanýcý adýnýzý girin"]');
  await page.type('input[placeholder="Kullanýcý adýnýzý girin"]', 'admin');
  await page.type('input[placeholder="••••"]', '1234');
  
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(3000);
  console.log('Test finished');
  await browser.close();
})();

