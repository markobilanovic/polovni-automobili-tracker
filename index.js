require('./controller');
const puppeteer = require('puppeteer');
const mailService = require('./mailService');
const db = require('./db');
const utils = require('./utils');

let browser;
let page;
let date;

async function init() {
  console.log("Launching browser...");
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  page = await browser.newPage();
  page.setDefaultNavigationTimeout(120 * 1000);
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    if (resourceType !== "document") {
      req.abort();
    } else {
      req.continue();
    }
  });
  start();
}

async function start() {
  try {
    console.log("Start script...");
    date = utils.getCurrentDate();
    const tasks = await db.getTasks();
    for (const task of tasks) {
      const { title, email, url, processedids } = task;
      console.log("Process", title, email, processedids.length);
      const articles = await getNewArticles(url, processedids.map((id) => id.toString()));
      if (articles.length) {
        await processArticles(articles, title, email);
        await db.updateTask(title, email, articles.map((article) => article.id));
      }
    }

    console.log("Script ended!");
    setTimeout(() => {
      start();
    }, 15 * 60 * 1000);
  } catch (e) {
    console.log("Error!", e);
    if (browser) {
      console.log("Force closing browser...");
      await browser.close();
      setTimeout(() => {
        init();
      }, 2 * 60 * 1000);
    }
  }

}

async function getNewArticles(baseURL, processedIds) {
  let articles = [];
  await page.goto(baseURL);

  // process first page
  articles.push(...await processPage(baseURL, processedIds, false));

  // process rest of the pages
  const pagesCount = await getPagesCount();
  if (pagesCount > 1) {
    for (let i = 2; i <= pagesCount; i++) {
      const url = baseURL + "&page=" + i;
      articles.push(...await processPage(url, processedIds));
    }
  }

  return articles;
}

async function processPage(url, processedIds, loadPageFirst = true) {
  const articlesForProcessing = [];
  if (loadPageFirst) {
    await page.goto(url);
  }
  const articles = await page.$$("article");
  for (let article of articles) {
    const articleID = await page.evaluate(el => el.getAttribute("data-classifiedid"), article);
    if (!articleID) {
      continue;
    }

    if (processedIds.indexOf(articleID) !== -1) {
      continue;
    }

    const url = await getArticleURL(article);
    const innerHTMLElement = await article.getProperty("outerHTML");
    let innerHTML = await innerHTMLElement.jsonValue();

    // article title
    const [title] = await article.$$eval('h2 > a', (options) =>
    options.map((option) => option.textContent.replaceAll("\t", "").replaceAll("\n", ""))
  );

    // price 
    const [price] = await article.$$eval('.price', (options) =>
      options.map((option) => option.textContent.replaceAll("\t", "").replaceAll("\n", ""))
    );

    // image URL
    let index = innerHTML.indexOf("data-src=");
    let parts = innerHTML.substring(index).split("\"");
    const imageURL = parts[1];

    // Article URL
    index = innerHTML.indexOf("/auto-oglasi/");
    parts = innerHTML.substring(index).split("\"");
    const articleURL = "https://www.polovniautomobili.com" + parts[0];

    // city
    const [city] = await article.$$eval('.city', (options) =>
      options.map((option) => option.textContent.replaceAll("\t", "").replaceAll("\n", ""))
    );

    // other info
    const setInfo = await article.$$eval('.setInfo', (options) =>
      options.map((option) => option.textContent.replaceAll("\t", "").split("\n"))
    );

    let kubikaza = "";
    let kilometraza = "";
    let konjskihSnaga = "";
    let godiste = "";

    setInfo.forEach((info) => {
      godiste = info[0];;
      info.forEach((val) => {
        if (val.indexOf(" cm3") !== -1) {
          kubikaza = val;
        } else if (val.indexOf(" km") !== -1) {
          kilometraza = val;
        } else if (val.indexOf("KS)") !== -1) {
          konjskihSnaga = val;
        }

      });
    })

    const articleHTML = `<div>
        <h2>${title}</h2>
        <a href="${articleURL}">
          <img src="${imageURL}" />
        </a>
        <div>
          <h3>${price}</h3>
          <h3>${godiste}</h3>
          <h3>${kilometraza}</h3>
          <div>${city}</div>
          <br/>
          <div>${kubikaza}, ${konjskihSnaga}</div>
        </div>
      </div>`;


    articlesForProcessing.push({
      id: articleID,
      url,
      articleHTML,
    });
  }
  return articlesForProcessing;
}

async function getArticleURL(articleElement) {
  const h2Element = await articleElement.$("h2");
  if (!h2Element) {
    return null;
  }
  const aElement = await h2Element.$("a");
  if (!aElement) {
    return null;
  }
  const href = await aElement.getProperty("href");
  if (!href) {
    return null;
  }
  const url = await href.jsonValue();
  return url;
}

async function processArticles(articles, title, email) {
  const htmls = articles.map((article) => {
    return `<div>
      ${article.articleHTML}
    </div>`;
  });
  const html = htmls.join('<br/>');
  await mailService.sendEmail([email], `${title} - Count: ${articles.length} - ${date}`, "", html);
}

async function getPagesCount() {
  const [totalItemsDiv] = await page.$x("//small[contains(., 'Prikazano od')]");
  const totalItemsString = await page.evaluate(el => el.textContent, totalItemsDiv);
  const totalItemsParts = totalItemsString.split(' ');
  const itemsLength = Number(totalItemsParts[totalItemsParts.length - 1]);
  const pagesCount = Math.ceil(itemsLength / 25);
  return pagesCount;
}

init();

