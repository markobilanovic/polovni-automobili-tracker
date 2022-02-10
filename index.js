require('./controller');
const puppeteerManager = require('./puppeteerManager');
const mailService = require('./mailService');
const db = require('./db');
const utils = require('./utils');
const scraperAutomobili = require('./scrapers/PolovniAutomobili/scraper');
const emailBuilderAutomobili = require('./scrapers/PolovniAutomobili/emailBuilder');
const scraperZida4 = require('./scrapers/Zida4/scraper');
const emailBuilderZida4 = require('./scrapers/Zida4/emailBuilder');
const scraperGaraze = require('./scrapers/Garaze/scraper');
const emailBuilderGaraze = require('./scrapers/Garaze/emailBuilder');


let date;

async function runScript() {
  try {
    date = utils.getCurrentDate();
    console.log("Started...", date);
    const automobili = await db.getAutomobili();
    for (const automobil of automobili) {
      const { title, email, url, ids } = automobil;
      const articles = await scraperAutomobili.scrapeURL(url, ids.map((id) => id.toString()));
      if (articles.length) {
        const emailBody = emailBuilderAutomobili.getEmailBody(articles);
        await mailService.sendEmail([email], `${title} - Count: ${articles.length} - ${date}`, "", emailBody);
        await db.updateAutomobil(title, email, articles.map((article) => article.id));
      }
    }

    const stanovi = await db.getZida4();
    for (const stan of stanovi) {
      const { title, email, url, ids } = stan;
      const articles = await scraperZida4.scrapeURL(url, ids.map((id) => id.toString()));
      if (articles.length) {
        const emailBody = emailBuilderZida4.getEmailBody(articles);
        await mailService.sendEmail([email], `${title} - Count: ${articles.length} - ${date}`, "", emailBody);
        await db.updateZida4(title, email, articles.map((article) => article.id));
      }
    }

    // const garaze = await db.getGaraze();
    // for (const garaza of garaze) {
    //   const { title, email, url, ids } = garaza;
    //   const articles = await scraperGaraze.scrapeURL(url, ids.map((id) => id.toString()));
    //   if (articles.length) {
    //     const emailBody = emailBuilderGaraze.getEmailBody(articles);
    //     await mailService.sendEmail([email], `${title} - Count: ${articles.length} - ${date}`, "", emailBody);
    //     await db.updateGaraze(title, email, articles.map((article) => article.id));
    //   }
    // }

    console.log("Finish");
    setTimeout(() => runScript(), 15 * 60 * 1000);
  } catch (e) {
    console.log("Error!", e);
    const browser = puppeteerManager.getBrowser();
    if (browser) {
      await browser.close();
      setTimeout(() => startApplication(), 2 * 60 * 1000);
    }
  }
}

async function startApplication() {
  await puppeteerManager.initPuppeteer();
  await runScript();
}

startApplication();

