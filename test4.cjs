const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3002');
  await new Promise(r => setTimeout(r, 1000));
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
  const html = await page.content();
  console.log('HTML DUMP:');
  console.log(html);
  await browser.close();
})();
