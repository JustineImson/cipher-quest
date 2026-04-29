const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER_ERROR:', error.message));
  page.on('requestfailed', request => console.log('BROWSER_REQUEST_FAILED:', request.url(), request.failure().errorText));

  // Forward unhandled console errors
  page.on('error', err => console.log('BROWSER_PAGE_ERROR:', err.message));

  await page.goto('http://localhost:5173/story', { waitUntil: 'load' });
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Click the Easy button
  let buttons = await page.$$('button');
  for (let b of buttons) {
    let t = await page.evaluate(el => el.textContent, b);
    if (t === 'Easy') {
      await b.click();
      console.log('Clicked Easy');
      break;
    }
  }

  // Wait a little bit for the canvas to load or crash
  await new Promise(r => setTimeout(r, 6000));
  
  await browser.close();
})();
