require('./controller');
const puppeteerManager = require('./puppeteerManager');
// const mailService = require('./mailService');
// const db = require('./db');
const utils = require('./utils');
const scraper = require('./scraper');
const emailBuilder = require('./emailBuilder');

let date;

async function runScript() {
  try {
    date = utils.getCurrentDate();
    console.log("Started...", date);
    // const tasks = await db.getTasks();
    // for (const task of tasks) {
    //   const { title, email, url, processedids } = task;

      const url = "https://www.polovniautomobili.com/auto-oglasi/pretraga?brand=kia&model%5B%5D=ceed&brand2=&price_from=&price_to=&year_from=2014&year_to=&chassis%5B%5D=2631&flywheel=&atest=&door_num=&submit_1=&without_price=1&date_limit=&showOldNew=all&modeltxt=&engine_volume_from=&engine_volume_to=&power_from=&power_to=&mileage_from=&mileage_to=&emission_class=&seat_num=&wheel_side=&registration=&country=&country_origin=&city=&registration_price=&page=5&sort=tagValue131_asc";

      const articles = await scraper.scrapeURL(url, []);
      if (articles.length) {
        const emailBody = emailBuilder.getEmailBody(articles);
        console.log(emailBody);
        // await mailService.sendEmail([email], `${title} - Count: ${articles.length} - ${date}`, "", emailBody);
        // await db.updateTask(title, email, articles.map((article) => article.id));
      }
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