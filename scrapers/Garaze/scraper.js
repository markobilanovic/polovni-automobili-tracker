const puppeteerManager = require('../../puppeteerManager');

let page;

// baseURL = https://www.oglasi.rs/oglasi/nekretnine/izdavanje/garaza-parking-mesto/grad/novi-sad?s=d

async function scrapeURL(baseURL, processedIds) {
    let articles = [];
    page = puppeteerManager.getPage();
    await page.goto(baseURL);

    // process first page
    articles.push(...await getArticlesFromPage(baseURL, processedIds, false));

    // process rest of the pages
    const pagesCount = await getPagesCount();
    if (pagesCount > 1) {
        for (let i = 2; i <= pagesCount; i++) {
            const url = baseURL + "&p=" + i;
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
        const [aElement] = await article.$$('a.fpogl-list-image');
        let url = await page.evaluate(el => el.getAttribute("href"), aElement);
        const parts = url.split("/");
        const articleID = parts[parts.length - 2];
        url = "https://www.oglasi.rs" + url;


        if (!articleID) {
            continue;
        }

        if (processedIds.indexOf(articleID) !== -1) {
            continue;
        }

        const newArticle = await parseArticle(article, articleID, url);
        newArticles.push(newArticle);
    }
    return newArticles;
}

async function parseArticle(article, id, url) {
    const innerHTMLElement = await article.getProperty("outerHTML");
    let innerHTML = await innerHTMLElement.jsonValue();

    // title
    // image URL
    const [imgElement] = await article.$$('figure > a > img');
    const imageURL = await page.evaluate(el => el.getAttribute("src"), imgElement);
    const title = await page.evaluate(el => el.getAttribute("alt"), imgElement);

    const [locationParent] = await article.$x('//a[@class="fpogl-list-title"]/parent::*');
    const locationArray = await locationParent.$$eval('a', (options) =>
        options.map((option) => option.textContent.replaceAll("\t", "").replaceAll("\n", ""))
    );
    const location = locationArray[locationArray.length -1];

    const description = await article.$$eval('p[itemprop="description"]', (options) =>
        options.map((option) => option.textContent.replaceAll("\t", "").replaceAll("\n", ""))
    );

    return {
        title,
        imageURL,
        url,
        location,
        description,
    }

}

async function getPagesCount() {
    const liElements = await page.$$eval('ul.pagination > li', (options) =>
        options.map((option) => option.textContent.replaceAll("\t", "").replaceAll("\n", ""))
    );
    const pagesCount = liElements[liElements.length - 2];
    return pagesCount;
}


module.exports = {
    scrapeURL: scrapeURL,
}