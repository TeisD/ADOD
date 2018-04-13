const request = require('request');
const throttledRequest = require('throttled-request')(request);
const { JSDOM } = require('jsdom');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql');

throttledRequest.configure({
  requests: 10,
  milliseconds: 1000
});

const BASE_URL = 'http://fuorisalone.it/2018/en/events'
const MAX_PAGE = 33;
const AUTH = require('../../shared/config/keys/mysql.json');

const db = mysql.createPool({
	connectionLimit: 100,
  host: AUTH.host,
  user: AUTH.user,
  password: AUTH.password,
	database: 'mdw_2018',
  charset : 'utf8mb4',
  //debug: true
});

function step1() {
	const pages = [];
	for(let i = 1; i <= MAX_PAGE; i++) {
		pages.push(step1Worker(i));
	}

	Promise.all(pages).then((data) => {
		data = _.flatten(data);
		console.log('Done!');
		fs.writeFileSync(path.join(__dirname, '../../../mdw-2018-data/fuorisalone/pages.json'), JSON.stringify(data, null, 2));
	}).catch(console.error);
}


let reqCount = 0,
		dbCount = 0,
		dataCount = 0;

function step2() {
	let urls = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../mdw-2018-data/fuorisalone/pages.json')));
	dataCount = urls.length;
	Promise.all(urls.map((url) => {
		return step2Worker(encodeURI(url))
	})).then((data) => {
		return Promise.all(data.map((d) => {
			return new Promise((resolve, reject) => {
				db.query('INSERT INTO fuorisalone (title, organiser, address, description, extended, tuesday, wednesday, thursday, friday, saturday, sunday) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', d, (err, results) => {
					if (err) reject(err);
					dbCount++;
					console.log(dbCount+'/'+dataCount);
					resolve()
				});
			});
		}));
	}).then(() => {
		console.log('Done!');
	}).catch((err) => {
		console.error(err);
	});
}


/**
 * Get a list of links
 */
function step1Worker(page) {
	return new Promise((resolve, reject) => {
		request.get({
			url: BASE_URL,
			qs: {
				page: page
			}
		}, (err, response, body) => {
			if(err) return reject(err);
			if(response.statusCode != 200) return reject(response.statusCode);
			const { document } = (new JSDOM(body)).window;
			let events = document.querySelectorAll('.event-cnt');
			let urls = [].map.call(events, (event) => {
				return event.querySelector('a.ev-name').getAttribute('href');
			});
			resolve(urls);
		})
	});
}

function step2Worker(url) {
	return new Promise((resolve, reject) => {
		throttledRequest(url, (err, response, body) => {
			if(err) return reject(err);
			if(response.statusCode != 200) return reject(response);

			reqCount++;
			console.log(`${reqCount}/${dataCount}`);

			const { document } = (new JSDOM(body)).window;
			let article = document.querySelector('article');
			let title = article.querySelector('.scheda-evento-titolo h1').textContent;
			let organiser = article.querySelector('.scheda-evento-location h2').childNodes[0].nodeValue;
			let address = article.querySelector('.scheda-evento-location h2 span').textContent.split('\n\t')[0];
			let description = article.querySelector('.claim-evento').textContent;
			let extended = article.querySelector('.scheda-evento-desc-strip').textContent;
			let dates = article.querySelectorAll('.giorno_palinsesto');
			dates = [].map.call(dates, (date) => {
				let hours = date.querySelectorAll('.ora_palinsesto span');
				if(hours.length < 1) return null;
				let start = hours[0].textContent.split('-')[0].trim();
				let end = hours[hours.length - 1].textContent.split('-')[1].trim();
				return start + ' — ' + end;
			})

			/*resolve({
				title: title.trim(),
				organiser: organiser.trim(),
				address: address.trim(),
				description: description.trim(),
				extended: extended.trim(),
				dates: dates
			});*/
			resolve([
				title.trim(),
				organiser.trim(),
				address.trim(),
				description.trim(),
				extended.trim(),
				dates[0],
				dates[1],
				dates[3],
				dates[4],
				dates[5],
				dates[6],
			]);
		})
	})
}

step2();
