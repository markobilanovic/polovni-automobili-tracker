const puppeteer = require('puppeteer');
const mailService = require('./mailService');
var express = require('express');
var app = express();
var path = require('path');
const e = require('express');
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(process.env.PORT || 4000, function () {
    console.log('Node app is working!');
});

const db = [
  // {
  //   title: "Peugeot 308",
  //   url: "https://www.polovniautomobili.com/auto-oglasi/pretraga?sort=tagValue131_asc&brand=peugeot&model%5B0%5D=308&year_from=2014&chassis%5B0%5D=2631&city_distance=0&showOldNew=all&without_price=1",
  //   processedIds: [17233908,19287264,19205256,19057223,19003948,19211277,18870469,19026066,19346544,19149596,19097082,19105309,19209758,19287352,19333957,19003429,19177440,19273419,19253453,18996225,19391752,19131221,19385096,19144553,18893666,19385925,18968267,19255390,19311205,19022643,18887838,19334929,18346398,18717994,19066347,19193278,19087121,18276110,18647045,18554121,19265513,18901645,19235122,18911876,19124257,19044880,19069892,19192073,19392240,19198074,19066492,19344599,19021606,18837905,18989317,19156237,19221410,16818142,19290995,18794874,18992344,19148558,18898978,18538061,18586402,18882864,19194424,19334047,18589843,18894827,19195457,18197763,19101766,18926789,17300050,19098275,19204524,19142998,18856843,19148932,18427693,19376012,18896882,18748978,18739852,19055385,18973693,19350075,17910977,18536880,19034619,19065693,19127397,19169768,18882870,19113454,17107112,19323999,18485555,18722493,19177174,19342891,19031725],
  // },
  // {
  //   title: "Kia Ceed",
  //   url: "https://www.polovniautomobili.com/auto-oglasi/pretraga?brand=kia&model%5B%5D=ceed&brand2=&price_from=&price_to=&year_from=2014&year_to=&chassis%5B%5D=2631&flywheel=&atest=&door_num=&submit_1=&without_price=1&date_limit=&showOldNew=all&modeltxt=&engine_volume_from=&engine_volume_to=&power_from=&power_to=&mileage_from=&mileage_to=&emission_class=&seat_num=&wheel_side=&registration=&country=&country_origin=&city=&registration_price=&page=5&sort=tagValue131_asc",
  //   processedIds: [17913644,16798194,18193609,18806012,18889149,18810398,18675209],
  // }
];

let browser;
let page;

async function init() {

  try {
    const client = await pool.connect();
    // await client.query('CREATE TABLE tasks(title text, email text, url text, processedIds integer[])');
    await client.query(`INSERT INTO tasks("Peugeot 308", "bilanovic90@gmail.com", "https://www.polovniautomobili.com/auto-oglasi/pretraga?sort=tagValue131_asc&brand=peugeot&model%5B0%5D=308&year_from=2014&chassis%5B0%5D=2631&city_distance=0&showOldNew=all&without_price=1", {})`);
   
    // const result = await client.query('SELECT * FROM tasks');
    // const results = result ? result.rows : null;
    // console.log(results);
    client.release();
  } catch (err) {
    console.error(err);
  } finally {
    // const client = await pool.connect();
    // const result = await client.query('SELECT * FROM tasks');
    // const results = result ? result.rows : null;
    // console.log(results);
    // client.release();
  }

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
  console.log("Browser initialized!");
  
  start();
}

async function start() {
  try{
    console.log("Start script...");
    let isDirty = false;
  
    for (const item of db) {    
      const {title, url, processedIds} = item;
      console.log("Process", title);
      const articles = await getNewArticles(url, processedIds.map((id) => id.toString()));
      if (articles.length) {
        await processArticles(articles, title)
        isDirty = true;
        processedIds.push(...articles.map((article) => article.id));
      }
    }
  
    if (isDirty) {
      await sendEmailOfDatabase(db);
    }
  
    console.log("Script ended!");

    setTimeout(() => {
      start();
    }, 900 * 1000);

  } catch (e) {
    console.log("Error!", e);
    if (browser) {
      console.log("Force closing browser...");
      await browser.close();
      setTimeout(() => {
        init();
      }, 180 * 1000);
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

async function processArticles(articles, title) {
  const htmls = articles.map((article) => `<div>${article.innerHTML}</div>`);
  const html = htmls.join('<br/>');
  const dateStr = new Date().toLocaleTimeString('en-US');
  await sendEmail(`Novi oglasi za: ${title} - ${dateStr}`, "", html);
}

async function sendEmail(subject, text, html) {
  await mailService.sendEmail(["bilanovic90@gmail.com"], subject, text, html);
}

async function sendEmailOfDatabase(db) {
  const content = db.map((item) => `${item.title}: ${item.processedIds.join(",")}`).join("\n");
  const dateStr = new Date().toLocaleTimeString('en-US');
  await mailService.sendEmail(["bilanovic90@gmail.com"], `polovni-automobili-scraper DB update - ${dateStr}`, content, "");
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