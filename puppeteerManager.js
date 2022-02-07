const puppeteer = require('puppeteer');
let browser;
let page;

async function initPuppeteer() {
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
}

function getPage() {
    return page;
}

module.exports = {
    initPuppeteer: initPuppeteer,
    getPage: getPage,
    browser: browser,
}