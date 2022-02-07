require('./controller');
const puppeteerManager = require('./puppeteerManager');
const mailService = require('./mailService');
const db = require('./db');
const utils = require('./utils');
const scraper = require('./scraper');
const emailBuilder = require('./emailBuilder');

let date;

async function runScript() {
  try {
    date = utils.getCurrentDate();
    console.log("Started...", date);
    const tasks = await db.getTasks();
    for (const task of tasks) {
      const { title, email, url, processedids } = task;
      const articles = await scraper.scrapeURL(url, processedids.map((id) => id.toString()));
      if (articles.length) {
        const emailBody = emailBuilder.getEmailBody(articles);
        await mailService.sendEmail([email], `${title} - Count: ${articles.length} - ${date}`, "", emailBody);
        await db.updateTask(title, email, articles.map((article) => article.id));
      }
    }

    console.log("Finish");
    setTimeout(() => runScript(), 15 * 60 * 1000);
  } catch (e) {
    console.log("Error!", e);
    if (puppeteerManager.browser) {
      await puppeteerManager.browser.close();
      setTimeout(() => startApplication(), 2 * 60 * 1000);
    }
  }
}

async function startApplication() {
  await puppeteerManager.initPuppeteer();
  await runScript();
}

startApplication();

