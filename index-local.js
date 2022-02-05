var express = require('express');
var app = express();
var path = require('path');
const utils = require('./utils');
const puppeteer = require('puppeteer');

app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/addRecord', (req, res) => {
    console.log(req.body);
  const {title, email, url} = req.body;
//   db.addNewTask(title, email, url);
    res.sendStatus(204);
});

app.get('/addRecord', (req, res) => {
  // db.clearProcessedIds(title, email, url);
  res.sendStatus(204);
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
    await getNewArticles("https://www.polovniautomobili.com/auto-oglasi/pretraga?page=2&sort=tagValue131_asc&brand=peugeot&model%5B0%5D=2008&year_from=2014&year_to=2020&city_distance=0&showOldNew=all&without_price=1&engine_volume_from=1300",[]);
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
          const innerHTMLElement = await article.getProperty("outerHTML");
          
          let innerHTML = await innerHTMLElement.jsonValue();

          
          
          //get image url
          innerHTML = innerHTML.replace("data-src=", "src=");
          const index = innerHTML.indexOf("data-src=");
          const parts = innerHTML.substring(index).split("\"");
          const imageURL = parts[1];
  
          // attach image
          innerHTML = `<br/><img href="${imageURL}" src="${imageURL}"></img>`.concat(innerHTML).concat("<br/><br/><br/>");

        // fix url
        innerHTML = innerHTML.replace("/auto-oglasi/", "https://www.polovniautomobili.com/auto-oglasi/");

        // color promoted
        innerHTML = innerHTML.replace("usedCarFeatured\"", "usedCarFeatured\" style=\"background: #a9373722;\"");

        
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
    await mailService.sendEmail([email], `Novi oglasi za: ${title} - ${date}`, "", html);
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
  