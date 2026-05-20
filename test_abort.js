import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    const artifactDir = 'C:\\Users\\Skilt\\.gemini\\antigravity\\brain\\6b3675e7-5627-4303-921d-54dd9973a989';

    console.log('Navigating to homepage...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

    // Take screenshot of initial main menu
    console.log('Taking screenshot of initial main menu...');
    await page.screenshot({ path: path.join(artifactDir, 'initial_main_menu.png') });

    // Step 2: Click Time Attack button
    console.log('Clicking Time Attack button...');
    const buttons = await page.$$('button');
    let timeAttackBtn = null;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Time Attack')) {
        timeAttackBtn = btn;
        break;
      }
    }
    if (!timeAttackBtn) {
      throw new Error('Time Attack button not found');
    }
    await timeAttackBtn.click();

    // Wait for the Time Attack page to render
    console.log('Waiting for Time Attack Mode to load...');
    await page.waitForSelector('button[title="Pause Operation"]', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000)); // wait a bit for any transitions

    // Take screenshot of playing state
    console.log('Taking screenshot of playing state...');
    await page.screenshot({ path: path.join(artifactDir, 'playing_time_attack.png') });

    // Step 3: Pause the game
    console.log('Clicking Pause button...');
    const pauseBtn = await page.$('button[title="Pause Operation"]');
    await pauseBtn.click();
    await new Promise(r => setTimeout(r, 1000));

    // Take screenshot of paused state
    console.log('Taking screenshot of paused state...');
    await page.screenshot({ path: path.join(artifactDir, 'paused_time_attack.png') });

    // Find Abort to Hub button
    const pauseButtons = await page.$$('button');
    let abortBtn = null;
    for (const btn of pauseButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Abort to Hub')) {
        abortBtn = btn;
        break;
      }
    }
    if (!abortBtn) {
      throw new Error('Abort to Hub button not found');
    }

    // Step 4: Click Abort to Hub
    console.log('Clicking Abort to Hub...');
    await abortBtn.click();

    // Wait for Main Menu to load again
    console.log('Waiting for Main Menu to load again...');
    await page.waitForSelector('.cq-bg', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 2000)); // wait a bit for any transitions

    // Take screenshot of final main menu
    console.log('Taking screenshot of final main menu...');
    await page.screenshot({ path: path.join(artifactDir, 'final_main_menu.png') });

    console.log('Screenshots taken successfully!');
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await browser.close();
  }
})();
