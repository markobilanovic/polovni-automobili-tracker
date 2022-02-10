import { getPage } from '../../puppeteerManager';

let page;

async function scrapeURL(baseURL, processedIds) {
    let articles = [];
    page = getPage();
    await page.goto(baseURL);

    // process first page
    articles.push(...await getArticlesFromPage(baseURL, processedIds, false));

    // process rest of the pages
    const pagesCount = await getPagesCount();
    if (pagesCount > 1) {
        for (let i = 2; i <= pagesCount; i++) {
            const url = baseURL + "&page=" + i;
            articles.push(...await getArticlesFromPage(url, processedIds));
        }
    }

    return articles;
}

async function getArticlesFromPage(url, processedIds, loadPageFirst = true) {
    if (loadPageFirst) {
        await page.goto(url);
    }
    const articles = await page.$$("article");
    return await parseArticles(articles, processedIds);
}

async function parseArticles(articles, processedIds) {
    const newArticles = [];
    for (let article of articles) {
        const articleID = await page.evaluate(el => el.getAttribute("data-classifiedid"), article);
        if (!articleID) {
            continue;
        }

        if (processedIds.indexOf(articleID) !== -1) {
            continue;
        }

        const newArticle = await parseArticle(article, articleID);
        newArticles.push(newArticle);
    }
    return newArticles;
}

async function parseArticle(article, id) {
    const innerHTMLElement = await article.getProperty("outerHTML");
    let innerHTML = await innerHTMLElement.jsonValue();

    // article title
    const [title] = await article.$$eval('h2 > a', (options) =>
        options.map((option) => option.textContent.replaceAll("\t", "").replaceAll("\n", ""))
    );

    // subtitle
    const [subtitle] = await article.$$eval('.subtitle', (options) =>
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

    let cm3 = "";
    let km = "";
    let hp = "";
    let year = "";

    setInfo.forEach((info) => {
        info.forEach((val) => {
            if (!year && val) {
                year = val; // first item is year
            } else if (val.indexOf(" cm3") !== -1) {
                cm3 = val;
            } else if (val.indexOf(" km") !== -1) {
                km = val;
            } else if (val.indexOf("KS)") !== -1) {
                hp = val;
            }
        });
    })

    return {
        id,
        title,
        subtitle,
        price,
        imageURL,
        articleURL,
        city,
        cm3,
        km,
        hp,
        year,
    }
}

async function getPagesCount() {
    const [totalItemsDiv] = await page.$x("//small[contains(., 'Prikazano od')]");
    const totalItemsString = await page.evaluate(el => el.textContent, totalItemsDiv);
    const totalItemsParts = totalItemsString.split(' ');
    const itemsLength = Number(totalItemsParts[totalItemsParts.length - 1]);
    const pagesCount = Math.ceil(itemsLength / 25);
    return pagesCount;
}


export const scrapeURL = scrapeURL;