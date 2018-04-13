/*
 * Adding keywords the ugly way
 */

const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const WordPOS = require('wordpos');
const Page = require('../../shared/modules/Page');

var wordpos = new WordPOS();

var pages = Page.loadFolder(path.join(__dirname, '../../../mdw-2018-data/pages'));

//var page = pages[0];

pages.forEach((page) => {
	let k = [],
			s = page.content.text;
	wordpos.getNouns(s.toLowerCase(), (r) => {
		k.push(r);
		wordpos.getVerbs(s.toLowerCase(), (r) => {
			k.push(r);
			wordpos.getAdjectives(s.toLowerCase(), (r) => {
				k.push(r);
				wordpos.getAdverbs(s.toLowerCase(), (r) => {
					k.push(r);
					// remove duplicates
					let res = _.uniq(_.flatten(k)).sort();
					let file = path.join(__dirname, `../../../mdw-2018-data/pages/${page.number}.json`);
					fs.readFile(file, (err, data) => {
						var json = JSON.parse(data)
						json.keywords.twitter = res;
						console.log(json.keywords.twitter);
						fs.writeFile(file, JSON.stringify(json, null, 2), 'utf8', (err) => {
							if(err) console.log(err);
						});
					});
				});
			});
		});
	});
});
