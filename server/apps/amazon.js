/*
 * Amazon book scraper for idb-2018
 * Run this file as a chron job every hour
 * 
 * Requires modified version of the amzsear python package
 * Append 'url=search-alias%%3Dstripbooks' to SEARCH_URL in amzSear/amzsear/core/consts.py
 */

const Page = require('../../shared/modules/Page');
const path = require('path')
const dotenv = require('dotenv');
const fs = require('fs');
const { execSync } = require('child_process');

dotenv.config();

const OUTPUT_DIR = path.join(process.env.DATA_DIR, 'amazon')
const TIMEOUT = 3

var pages = Page.loadFolder(path.join(process.env.DATA_DIR, 'pages'));

pages.forEach(page => {
    console.log('Fetching data for page ' + page.number);
    let terms = [];
    page.blocks.forEach(block => {
        block.lines.forEach((line, index) => {
            console.log(index + 1 + '/' + block.lines.length);
            let data = amazonSearch(line.text);
            data = JSON.parse(data.toString('utf8'));
            data = Object.values(data);
            data = data.filter(book => book.title.toLowerCase().indexOf('[sponsored]') < 0);
            data = data.filter(book => book.title.toLowerCase().indexOf('amazon') < 0);

            terms.push({
                term: line.text,
                amazon: data.slice(0, 3)
            })
        }); 
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, page.number + '.json'), JSON.stringify(terms));
    console.log('[OK] Stored data to ' + path.join(OUTPUT_DIR, page.number + '.json'));
});

function amazonSearch(title) {
    let command = `sleep ${TIMEOUT} && amzsear '${title}' --dont-open --output json`
    let stdout = execSync(command);
    return stdout;
}