const fs = require('fs');
const path = require('path');
const http = require('http');
const querystring = require('querystring');
const TextSearch = require('rx-text-search');
const Page = require('../shared/modules/Page');
const moment = require('moment');
const _ = require('lodash');

const PORT = 3000;
const KEY = fs.readFileSync(path.join(__dirname, '../shared/config/keys/api-key'), 'utf8').trim();
const DATA_DIR = path.join(__dirname, '../../mdw-2018-data/')

const pages = Page.loadFolder(path.join(DATA_DIR, 'pages'));

// start with a first rx-text-search
console.log('Initializing...');
return TextSearch.findAsPromise(query, '*.txt', {
	cwd: path.join(DATA_DIR, 'instagram/#salone2018')
}).then((data) => {
	console.log('[OK] Server ready');
	start();
}).catch((err) => {
	console.error(err);
})

function start() {
	const server = http.createServer((request, response) => {
		request.on('error', (err) => {
			console.error('[ERROR] ' + err);
			response.statusCode = 400;
			response.end();
		});

		response.on('error', (err) => {
			console.error('[ERROR] ' + err);
		});

		console.log('Client connected');

		if(request.method === 'POST') {
			let body = '';

			request.on('data', (chunk) => {
				body += chunk;
			}).on('end', () => {
				body = querystring.parse(body);

				let data,
						r;

				if(body.key.trim() !== KEY) {
					r = Promise.reject('401')
				} else {
					switch(request.url){
						case '/instagram':
							console.log('-> /instagram');
							try {
								r = instagram(body.page);
							} catch (e) {
								r = Promise.reject(e);
							}
							break;
						case '/search':
							console.log('-> /search');
							try {
								r = search(body.page);
							} catch (e) {
								r = Promise.reject(e);
							}
							break;
						case '/salone':
							console.log('-> /salone');
							try {
								r = salone(body.page);
							} catch (e) {
								r = Promise.reject(e);
							}
							break;
						default:
							r = Promise.reject('404');
							break;
					}
				}

				if(typeof r === 'undefined') r = Promise.reject("Routine returned undefined");

				r.then((data) => {
					response.statusCode = 200;
					response.setHeader('Content-Type', 'application/json');
					response.end(JSON.stringify(data));
					console.log("[OK] Sent response to client");
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
}

function instagram(page) {
	var p = Page.find(pages, page);

	if(typeof p === 'undefined') return Promise.reject('Page "' + page + '" not found');

	var query = p.keywords.instagram.map((ig) => {
		return ig.keywords;
	});

	query = _.flatten(query).map((keyword) => {
		return keyword.replace(/\s/g, '.*');
	});

	query = query.join('|');
	let startTime = process.uptime();

	return TextSearch.findAsPromise(query, '*.txt', {
		cwd: path.join(DATA_DIR, 'instagram/#salone2018')
	}).then((data) => {

		console.log("-> " + data.length + " results in " + (process.uptime() - startTime) + 's');

		// add the right result(s) to each keyword
		p.keywords.instagram.forEach((keyword) => {
			let q = new RegExp(keyword.keywords.join('|').replace(/\s/g, '.*'), 'i');
			data.forEach((match) => {
				if(q.test(match.text)) {
					let filename = match.file.substr(0, match.file.lastIndexOf('_UTC') + 4) + '.jpg';

					if(!keyword.hasOwnProperty('images')) {
						keyword.images = [filename];
						return;
					}

					if(keyword.hasOwnProperty('all') && keyword.all) {
						keyword.images.push(filename);
					} else {
						let newTime = match.file;
						let oldTime = keyword.images[0];
						newTime = newTime.substring(newTime.lastIndexOf('/') + 1, newTime.lastIndexOf('_UTC'));
						oldTime = oldTime.substring(oldTime.lastIndexOf('/') + 1, oldTime.lastIndexOf('_UTC'));
						newTime = moment(newTime, 'YYYY-MM-DD_HH-mm-ss');
						oldTime = moment(oldTime, 'YYYY-MM-DD_HH-mm-ss');
						if(newTime > oldTime) keyword.images = [filename];
					}

				}
			})
		});

		// remove the empty results
		let response = p.keywords.instagram.filter((keyword) => {
			return (keyword.hasOwnProperty('images') || keyword.hasOwnProperty('always'));
		});

		// sort the "all" results internally
		response.forEach((keyword) => {
			if(keyword.hasOwnProperty('all') && keyword.all) {
				keyword.images.sort((a, b) => sort);
				keyword.images = keyword.images.slice(0, 50);
			}
		});

		// sort the results (put the "always" result on top)
		response.sort((a, b) => {
			if (a.hasOwnProperty('always') && a.always) return 1;
			else return sort(a.images[0], b.images[0]);
		});

		return Promise.resolve(response);
	})

	/**
	 * Sort filename by date
	 */
	function sort(a, b) {
		a = a.substring(a.lastIndexOf('/') + 1, a.lastIndexOf('_UTC'));
		b = b.substring(b.lastIndexOf('/') + 1, b.lastIndexOf('_UTC'));
		a = moment(a, 'YYYY-MM-DD_HH-mm-ss');
		b = moment(b, 'YYYY-MM-DD_HH-mm-ss');
		return b - a;
	}
}

function search() {
}

function salone(page) {
	return new Promise((resolve, reject) => {
		fs.readFile(path.join(DATA_DIR, 'projects', page, 'vis.json'), (err, data) => {
			if (err) {
				if(err.code === 'ENOENT') return reject(404)
				else return reject(err);
			}
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
