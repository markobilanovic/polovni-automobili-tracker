const puppeteerManager = require('../../puppeteerManager');

let page;

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
            const url = baseURL + "&strana=" + i;
            articles.push(...await getArticlesFromPage(url, processedIds));
        }
    }

    return articles;
}

async function getArticlesFromPage(url, processedIds, loadPageFirst = true) {
    if (loadPageFirst) {
        await page.goto(url);
    }
    const articles = await page.$$(".ad-preview-card");
    return await parseArticles(articles, processedIds);
}

async function parseArticles(articles, processedIds) {
    const newArticles = [];
    for (let article of articles) {
        const [aElement] = await article.$$('a');
        let url = await page.evaluate(el => el.getAttribute("href"), aElement);
        const parts = url.split("/");
        const articleID = parts[parts.length - 1];
        url = "https://www.4zida.rs" + url;

        if (!articleID) {
            continue;
        }

        if (processedIds.indexOf(articleID) !== -1) {
            continue;
        }

        const articleObj = await parseArticle(article, articleID, url);
        console.log(articleObj);
        const outerHTMLElement = await article.getProperty("outerHTML");
        let outerHTML = await outerHTMLElement.jsonValue();

        const item = {
            articleID,
            outerHTML,
        }

        newArticles.push(item);
    }
    return newArticles;
}

async function parseArticle(article, id, url) {
    // // price
    const [price] = await article.$$eval('.prices > h3', (options) =>
        options.map((option) => option.textContent.replaceAll("\t", "").replaceAll("\n", ""))
    );

    // image URL
    const [imgElement] = await article.$$('img.preview-img');
    let imageURL = await page.evaluate(el => el.getAttribute("src"), imgElement);
    
    
    // info
    const info = await article.$$eval('.meta-labels-separator > *', (options) =>
        options.map((option) => option.textContent.replaceAll("\t", "").replaceAll("\n", ""))
    );
    const m2 = info[0];
    const rooms = info[1];
    const floor = info[2];
    const heat = info[3];

    // // location
    const [location] = await article.$$eval('.place-names', (options) =>
        options.map((option) => option.textContent.replaceAll("\t", "").replaceAll("\n", ""))
    );
    

    // preview-desc
    const [desc] = await article.$$eval('.preview-desc', (options) =>
        options.map((option) => option.textContent.replaceAll("\t", "").replaceAll("\n", ""))
    );

    return {
        id,
        imageURL,
        url,
        price,
        m2,
        rooms,
        floor,
        heat,
        location,
        desc,
    }
}

async function getPagesCount() {
    const pageItems = await page.$$eval('.page-item ', (options) =>
        options.map((option) => option.textContent.replaceAll("\t", "").split("\n"))
    );
    const pagesCount = pageItems[pageItems.length - 1];
    return pagesCount;
}


module.exports = {
    scrapeURL: scrapeURL,
}