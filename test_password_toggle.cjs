const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('http://localhost:5000/connexion');
  await page.fill('input[type="email"]', 'admin@sogeco.cm');
  await page.fill('input[type="password"]', 'Primce2005@');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'C:\\Users\\user\\AppData\\Local\\Temp\\claude\\c--Users-user-Desktop-sogeco-fleet-frontend\\e9b38885-3f40-4b78-9009-51c98394dfec\\scratchpad\\password_hidden.png' });

  await page.click('button[aria-label="Afficher le mot de passe"]');
  await page.waitForTimeout(300);
  const inputType = await page.$eval('#password', (el) => el.type);
  console.log('INPUT_TYPE_AFTER_TOGGLE:', inputType);
  await page.screenshot({ path: 'C:\\Users\\user\\AppData\\Local\\Temp\\claude\\c--Users-user-Desktop-sogeco-fleet-frontend\\e9b38885-3f40-4b78-9009-51c98394dfec\\scratchpad\\password_visible.png' });

  console.log('CONSOLE_ERRORS:', JSON.stringify(errors));
  await browser.close();
})();
