const fs = require('fs');
const path = require('path');
const http = require('http');
const querystring = require('querystring');
const TextSearch = require('rx-text-search');
const Page = require('../shared/modules/Page');
const moment = require('moment');

const PORT = 3000;
const KEY = fs.readFileSync(path.join(__dirname, '../shared/config/keys/api-key'), 'utf8');
const DATA_DIR = path.join(__dirname, '../../mdw-2018-data/')

const pages = Page.loadFolder(path.join(DATA_DIR, 'pages'));

console.log("api key: " + KEY);

const server = http.createServer((request, response) => {
	request.on('error', (err) => {
    console.error('[ERROR] ' + err);
    response.statusCode = 400;
    response.end();
  });

	response.on('error', (err) => {
    console.error('[ERROR] ' + err);
  });

	if(request.method === 'POST') {
		let body = '';

		request.on('data', (chunk) => {
			body += chunk;
		}).on('end', () => {
			body = querystring.parse(body);

			let data,
					r;
			console.log(body);
			console.log('key: ' + body.key);

			if(body.key != KEY) {
				r = Promise.reject('401')
			} else {
				console.log('client connected');
				switch(request.url){
					case '/instagram':
						console.log('/instagram');
						r = instagram(body.page);
						break;
					case '/search':
						r = search(body.page);
						break;
					case '/salone':
						r = salone(body.page);
						break;
					default:
						r = Promise.reject('404');
						break;
				}
			}

			r.then((data) => {
				response.statusCode = 200;
				response.setHeader('Content-Type', 'application/json');
				response.end(JSON.stringify(data));
			})
			.catch((err) => {
				console.error('[ERROR] ' + err);
				if(err == '401') {
					response.statusCode = 401;
					response.end();
				} else if(err == '404') {
					response.statusCode = 404;
					response.end();
				} else {
					response.statusCode = 400;
					response.end(JSON.stringify(err));
				}
			});
		});
	} else {
		response.statusCode = 404;
		response.end();
	}

}).listen(PORT);

server.on('error', function (err) {
  console.error('[ERROR] ' + err);
});

function instagram(page) {
	var p = Page.find(pages, page);

	if(typeof p === 'undefined') return Promise.reject('Page "' + page + '" not found');

	var query = p.keywords.instagram.map((keyword) => {
		return keyword.keyword.replace(/\s/g, '.*');
	});

	return TextSearch.findAsPromise(query, '**/*.txt', {
		cwd: path.join(DATA_DIR, 'instagram')
	}).then((data) => {
		let response = [];

		// add the most new instagram picture to each keyword
		data.forEach(result => {
			// skip duplicates
			if(typeof response.find(r => r.file == result.file) !== "undefined") return;
			let term = result.term.replace(/\.\*/g, ' ');
			let keyword = response.find(k => k.keyword == term);
			if(typeof keyword === "undefined") {
				keyword = p.keywords.instagram.find(k => k.keyword == term);
				keyword.file = result.file;
				response.push(keyword);
			} else {
				let a = result.file.substring(result.file.lastIndexOf('/') + 1, result.file.lastIndexOf('_UTC'));
				let b = keyword.file.substring(keyword.file.lastIndexOf('/') + 1, keyword.file.lastIndexOf('_UTC'));
				a = moment(a, 'YYYY-MM-DD_HH-mm-ss');
				b = moment(b, 'YYYY-MM-DD_HH-mm-ss');
				if(a > b) keyword.file = result.file;
			}
		});

		// sort by most recent picture
		response.sort((a, b) => {
			a = a.file.substring(a.file.lastIndexOf('/') + 1, a.file.lastIndexOf('_UTC'));
			b = b.file.substring(b.file.lastIndexOf('/') + 1, b.file.lastIndexOf('_UTC'));
			a = moment(a, 'YYYY-MM-DD_HH-mm-ss');
			b = moment(b, 'YYYY-MM-DD_HH-mm-ss');
			return b - a;
		})

		// return only the five first results
		return Promise.resolve(response.slice(0, 5));
	})
}

function search() {
}

function salone(page) {
	return new Promise((resolve, reject) => {
		fs.readFile(path.join(DATA_DIR, 'projects', page, 'vis.json'), (err, data) => {
			if (err) return reject(err);
			if(typeof data === "undefined") return reject('404');
			let response = '';

			JSON.parse(data).forEach(s => {
				if(s.caption) {
					response += s.caption.charAt(0).toUpperCase() + s.caption.slice(1) + '. ';
				}
			});

			resolve(response.trim());
		});
	});
}
