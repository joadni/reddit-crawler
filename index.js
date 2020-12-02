const puppeteer = require('puppeteer');
const Sheet = require('./sheet');

const url =
    'https://old.reddit.com/r/learnprogramming/comments/4q6tae/i_highly_recommend_harvards_free_online_2016_cs50/';

(async function () {
    // const browser = await puppeteer.launch({ headless: false }); - Headed server
    const browser = await puppeteer.launch(); // - Headless server
    const page = await browser.newPage();
    await page.goto(url);

    const sheet = new Sheet();
    await sheet.load();

    // create sheet with title
    const title = await page.$eval('.title a', (el) => el.textContent);
    const sheetIndex = await sheet.addSheet(title.slice(0, 70), [
        'points',
        'text'
    ]);

    // expand all comment threads
    let expandButtons = await page.$$('.morecomments');
    while (expandButtons.length) {
        for (let button of expandButtons) {
            await button.click();
            await page.waitFor(500);
        }
        await page.waitFor(1000);
        expandButtons = await page.$$('.morecomments');
    }

    // select all comments, scrape text & points
    const comments = await page.$$('.entry');
    const formattedComments = [];
    for (let comment of comments) {
        // scrape points
        const points = await comment
            .$eval('.score', (el) => el.textContent)
            .catch((err) => console.log('no score'));

        // scrape text
        const rawText = await comment
            .$eval('.usertext-body', (el) => el.textContent)
            .catch((err) => console.log('no text'));

        if (points && rawText) {
            const text = rawText.replace(/\n/g, '');
            formattedComments.push({ points, text });
        }
    }

    // sort comments by points
    formattedComments.sort((a, b) => {
        const pointsA = Number(a.points.split(' ')[0]);
        const pointsB = Number(b.points.split(' ')[0]);
        return pointsB - pointsA;
    });
    console.log(formattedComments.slice(0, 10));

    // insert into google spreadsheet
    sheet.addRows(formattedComments, sheetIndex);

    await browser.close();
})();

// Change code to accept from command line or meta sheet to run multiple url's
// Prevent duplicate sheets to be added - hint read title for all sheets and delete if you have one with same title as the one you want to add