const puppeteer = require('puppeteer');
const mailService = require('./mailService');
const db = require('./db');
var express = require('express');
var app = express();
var path = require('path');
let browser;
let page;


app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(process.env.PORT || 4000, () => console.log('Node app is working!'));



async function init() {
  console.log("Launching browser...");
  browser = await puppeteer.launch({
    headless: true,
    args : ['--no-sandbox', '--disable-setuid-sandbox'],
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
  try{
    console.log("Start script...");
    const tasks = await db.getTasks();
    for (const task of tasks) {    
      const {title, email, url, processedids} = task;
      console.log("Process", title);
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

      if (processedIds.indexOf(articleID) === -1) { // ako nije obradjen
        const url = await getArticleURL(article);
        const innerHTMLElement = await article.getProperty("innerHTML");
        
        let innerHTML = await innerHTMLElement.jsonValue();
        
        //get image url
        innerHTML.replace("data-src=", "src=");
        const index = innerHTML.indexOf("data-src=");
        const parts = innerHTML.substring(index).split("\"");
        const imageURL = parts[1];

        // attach image
        innerHTML = `<br/><img href="${imageURL}" src="${imageURL}"></img>`.concat(innerHTML).concat("<br/><br/><br/>");

        articlesForProcessing.push({
          id: articleID,
          url,
          innerHTML,
        });
      }
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
  const htmls = articles.map((article) => `<div>${article.innerHTML}</div>`);
  const html = htmls.join('<br/>');
  const dateStr = new Date().toLocaleTimeString('en-US');
  await sendEmail(email, `Novi oglasi za: ${title} - ${dateStr}`, "", html);
}

async function sendEmail(to, subject, text, html) {
  await mailService.sendEmail([to], subject, text, html);
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