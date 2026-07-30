const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    const args = msg.args();
    if (args.length > 0) {
      console.log('PAGE LOG:', msg.type(), msg.text());
    }
  });
  
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:3002');
  await new Promise(r => setTimeout(r, 1000));
  
  const rootBefore = await page.evaluate(() => document.getElementById('root').innerHTML.substring(0, 50));
  console.log('ROOT BEFORE LOGIN:', rootBefore);
  
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input');
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    nativeInputValueSetter.call(inputs[0], 'admin');
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    nativeInputValueSetter.call(inputs[1], '1234');
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('button[type="submit"]').click();
  });
  
  await new Promise(r => setTimeout(r, 3000));
  
  const rootAfter = await page.evaluate(() => document.getElementById('root').innerHTML.substring(0, 50));
  console.log('ROOT AFTER LOGIN:', rootAfter);
  
  await browser.close();
})();
