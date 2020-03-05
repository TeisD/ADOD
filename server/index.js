/*
 * About port mapping
 * https://stackoverflow.com/questions/16573668/best-practices-when-running-node-js-with-port-80-ubuntu-linode
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const querystring = require('querystring');
const TextSearch = require('rx-text-search');
const Page = require('../shared/modules/Page');
const moment = require('moment');
const _ = require('lodash');
const util = require('util');
const {
	exec
} = require('child_process');
const mysql = require('mysql');
const dotenv = require('dotenv');

dotenv.config();

const PORT = process.env.PORT;
const KEY = fs.readFileSync(path.join(__dirname, '../shared/config/keys/api-key'), 'utf8').trim();
const DATA_DIR = process.env.DATA_DIR;

const INSTAGRAM_SEARCH = path.join(__dirname, 'apps/instagram-search.sh');
const INSTAGRAM_SEARCH_PATH = path.join(DATA_DIR, 'instagram');

const DB = process.env.DB;
const TWITTER_TABLE = 'twitter';
const FUORI_TABLE = 'fuorisalone';
const DB_AUTH = require('../shared/config/keys/mysql.json');

const pages = Page.loadFolder(path.join(DATA_DIR, 'pages'));

const db = mysql.createPool({
	connectionLimit: 75,
	host: DB_AUTH.host,
	user: DB_AUTH.user,
	password: DB_AUTH.password,
	database: DB,
	charset: 'utf8mb4',
	//debug: true
});

console.log('Initializing...');

start();

function start() {
	console.log('[OK] Server ready. Listening on port ' + PORT);
	const server = http.createServer((request, response) => {
		request.on('error', (err) => {
			console.error('[ERROR] ' + err);
			response.statusCode = 400;
			response.end();
		});

		response.on('error', (err) => {
			console.error('[ERROR] ' + err);
		});

		console.log(new Date().toISOString() + ' Client connected');

		if (request.method === 'POST') {
			let body = '';

			request.on('data', (chunk) => {
				body += chunk;
			}).on('end', () => {
				body = querystring.parse(body);

				let data,
					r;

				if(typeof body.key === 'undefined') {
					body.key = '';
				}

				if (body.key.trim() !== KEY) {
					r = Promise.reject('401')
				} else {
					switch (request.url.split('/')[1]) {
						case 'instagram':
							console.log('-> /instagram');
							try {
								r = instagramSimple(body.page);
							} catch (e) {
								r = Promise.reject(e);
							}
							break;
						case 'image':
							console.log('-> /image');
							try {
								r = image(body.image).then((data) => {
									response.writeHead(200, {
										'Content-Type': 'image/jpg'
									});
									response.end(data, 'binary');
								});
							} catch (e) {
								r = Promise.reject(e);
							}
							break;
						case 'twitter':
							console.log('-> /twitter');
							try {
								r = twitter(body.page);
							} catch (e) {
								r = Promise.reject(e);
							}
							break;
						case 'salone':
							console.log('-> /salone');
							try {
								r = salone(body.page);
							} catch (e) {
								r = Promise.reject(e);
							}
							break;
						case 'fuorisalone':
							console.log('-> /fuorisalone');
							try {
								r = fuorisalone(body.page);
							} catch (e) {
								r = Promise.reject(e);
							}
							break;
						case 'amazon':
							console.log('-> /amazon');
							try {
								r = amazon(body.page);
							} catch (e) {
								r = Promise.reject(e);
							}
							break;
						case 'pages':
							console.log('-> /pages (test)');
							r = Promise.resolve({});
							break;
						case 'z33':
							console.log('-> /z33 (instagram + twitter)');
							try {
								r = Promise.all([
									instagramSimple(body.page),
									twitter(body.page)
								]);
							} catch (e) {
								r = Promise.reject(e);
							}
							break;
						default:
							r = Promise.reject('404');
							break;
					}
				}

				if (typeof r === 'undefined') r = Promise.reject("Routine returned undefined");

				r.then((data) => {
						if (response.finished) return;
						response.statusCode = 200;
						response.setHeader('Content-Type', 'application/json');
						response.end(JSON.stringify(data));
						console.log("[OK] Sent response to client");
					})
					.catch((err) => {
						console.error('[ERROR] ' + err);
						if (err == '401') {
							response.statusCode = 401;
							response.end();
						} else if (err == '404') {
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
			response.end('A ditto, online device.');
			console.log('404');
			response.end();
		}

	}).listen(PORT);

	server.setTimeout(40000);

	server.on('error', function (err) {
		console.error('[ERROR] ' + err);
	});
}

function instagram(page) {
	var p = Page.find(pages, page);

	if (typeof p === 'undefined') return Promise.reject('Page "' + page + '" not found');

	var queries = []

	p.keywords.instagram.forEach((ig) => {
		queries.push(new Promise((resolve, reject) => {
			let query = ig.keywords.map((k) => {
				return `'` + k.replace(/\s/g, '.*') + `'`;
			}).join(' ');

			let count = (ig.hasOwnProperty('all') && ig.all) ? 30 : 3;

			exec(`bash '${INSTAGRAM_SEARCH}' '${INSTAGRAM_SEARCH_PATH}' ${count} ${query}`, (err, stdout, stderr) => {
				let res = {
					keywords: ig.keywords,
					images: stdout.split('\n').filter((i) => {
						return (i && i.length > 1);
					}).map((i) => {
						i = i.split('/');
						i = i.slice(i.length - 2).join('/');
						i = i.substr(0, i.lastIndexOf('_UTC') + 4) + '.jpg';
						return i;
					}),
					captions: ig.captions
				}
				if (ig.hasOwnProperty('always') && ig.always) res.always = true;
				resolve(res);
			})
		}));
	});

	return Promise.all(queries).then((data) => {
		// remove the empty results
		let response = data.filter((keyword) => {
			return (keyword.images.length > 0 || keyword.hasOwnProperty('always'));
		});

		// sort the "all" results internally
		response.forEach((keyword) => {
			if (keyword.hasOwnProperty('all') && keyword.all) {
				keyword.images.sort((a, b) => sort);
			}
		});

		// sort the results (put the "always" result on top)
		response.sort((a, b) => {
			if (a.hasOwnProperty('always') && a.always) return -1;
			if (b.hasOwnProperty('always') && b.always) return 1;
			return sort(a.images[0], b.images[0]);
		});

		return Promise.resolve(response);
	});

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

function instagramSimple(page) {
	var p = Page.find(pages, page);

	if (typeof p === 'undefined') return Promise.reject('Page "' + page + '" not found');

	let queue = []

	p.blocks.forEach(block => {
		block.lines.forEach(line => {
			queue.push(getPost(line));
		})
	})

	return Promise.all(queue).then(data => {
		return data.filter(k => k).sort((a, b) => {
			a = a.image.substring(a.image.indexOf('/'));
			b = b.image.substring(b.image.indexOf('/'));
			return b.localeCompare(a);
		});
	})

	function getPost(line) {
		let hashtag = _.sample(line.instagram);

		return new Promise((resolve, reject) => {
			if(typeof hashtag == 'undefined') return resolve();

			let dir =  path.join(process.env.DATA_DIR, 'instagram', hashtag);
			
			fs.readdir(dir, (err, files) => {
				if(err) {
					console.log('[ERROR] ' + err);
					return resolve();
				}

				files = files.filter(f => path.extname(f) == '.txt');
				
				// take the most recent file
				let file = files[files.length - 1];

				if(typeof file !== 'string') return resolve();

				fs.readFile(path.join(dir, file), (err, data) => {
					if(err) return resolve();

					let caption = data.toString();
					
					// cut if more than two hashtags
					let hashindex = caption.search(/#\w*\s*#/);
					if(hashindex > -1) {
						caption = caption.substring(0, hashindex);
					}
					// take first sentence only if too long
					caption = caption.trim();
					let lineindex = caption.substring(1, caption.length - 1).search(/[.?!\n]/);
					if(caption.length > 500 && lineindex > -1) {
						caption = caption.substring(0, lineindex + 1);
					}
					caption = caption.trim();

					// check if the image exists or is a gallery item
					let filename = hashtag + '/' + path.basename(file, '.txt') + '.jpg';
					fs.access(path.join(process.env.DATA_DIR, 'instagram', filename), err => {
						if(err && err.code === 'ENOENT') {
							filename = hashtag + '/' + path.basename(file, '.txt') + '_1.jpg'
						}

						resolve({
							id: line._id,
							keyword: line.text,
							image: filename,
							caption: caption
						})
					})
				})
			});
		});
	}
}

function image(image) {
	if (typeof image === 'undefined') return Promise.reject(404);

	return new Promise((resolve, reject) => {
		fs.readFile(path.join(DATA_DIR, 'instagram', image), (err, data) => {
			if (err) {
				if (err.code === 'ENOENT') return reject('404');
				return reject(err);
			}
			resolve(data);
		});
	});
}


function twitter(page) {
	var p = Page.find(pages, page);

	if (typeof p === 'undefined') return Promise.reject('Page "' + page + '" not found');

	if (typeof p.blocks === 'undefined') return Promise.reject('Page "' + page + '" does not contain data');

	let queries = [];

	p.blocks.forEach(block => {
		block.lines.forEach((line) => {
			queries.push(twitterQuery(line));
		});
	})

	return Promise.all(queries);

	/**
	 * Execute query as a promise
	 */
	function twitterQuery(k) {
		const table = getTableName(k.text);

		return new Promise((resolve, reject) => {
			db.query(`SELECT text, user, user_name, created_at FROM \`${table}\` ORDER BY timestamp DESC LIMIT 5`, [], function (err, response) {
				if (err) return reject(err);

				
				resolve({
					id: k._id,
					word: k.text,
					tweets: response
				});
			});
		})
	}

	/**
	 * Get the table named based on keyword
	 */
	function getTableName(keyword) {
		const extra = keyword.indexOf('(');
		if(extra != -1) {
			keyword = keyword.substring(0, extra);
		}
		keyword = keyword.trim();
		keyword = keyword.replace(/\s/g, "_");
		return keyword;
	}

	/**
	 * Clean a tweet and return the main body only
	 */
	function parseTweet(text) {
		// remove links
		text = text.replace(/http\S*/g, '');
		// remove subsequent hashtags
		text = text.replace(/#\w*\s*(#\w*\s*)+/g, '');
		// remove subsequent mentions
		text = text.replace(/@\w*\s*(@\w*\s*)+/g, '');
		// remove RT
		text = text.replace(/RT @\w*:/g, '');
		// remove via
		text = text.replace(/via @\w*/g, '');

		return text.trim();
	}
}


function salone(page) {
	return new Promise((resolve, reject) => {
		fs.readFile(path.join(DATA_DIR, 'projects', page, 'vis.json'), (err, data) => {
			if (err) {
				if (err.code === 'ENOENT') return reject(404)
				else return reject(err);
			}
			if (typeof data === "undefined") return reject('404');
			let response = '';

			JSON.parse(data).forEach(s => {
				if (s.caption) {
					response += s.caption.charAt(0).toUpperCase() + s.caption.slice(1) + '. ';
				}
			});

			resolve(response.trim());
		});
	});
}

function fuorisalone(page) {
	var p = Page.find(pages, page);

	if (typeof p === 'undefined') return Promise.reject('Page "' + page + '" not found');

	let today = moment().format('dddd').toLowerCase();

	let queries = p.keywords.time.map((keyword) => {
		let k = keyword.keywords.replace(/,/g, '%');
		return saloneQuery(k);
	})

	return Promise.all(queries).then((data) => {
		data = data.filter(n => n);
		if(data.length > 0) return Promise.resolve(data);
		// if no keywords found, make an additional query based on the year
		return Promise.all(p.keywords.time.map((keyword) => {
			return saloneQuery(keyword.year);
		}));
	}).then((data) => {
		data = data.filter((n) => {
			return (n != null && n.hasOwnProperty('title'));
		});
		return Promise.resolve([_.sample(data)]);
	});

	/**
	 * Execute query as a promise
	 */
	function saloneQuery(keyword) {
		return new Promise((resolve, reject) => {
			db.query(`SELECT * FROM ${FUORI_TABLE} WHERE ${today} IS NOT NULL AND description IS NOT NULL AND description != '' AND extended LIKE '%${keyword}%'`, [], function (err, result) {
				if (err) return reject(err);
				if (result.length == 0) return resolve();
				let description = result[0].description;
				if(description.length < 1) description = result[0].extended.split(' ').slice(0, 25).join(' ') + '...';
				resolve({
					title: result[0].title,
					organiser: result[0].organiser,
					address: result[0].address.replace(/\t.*/, ''),
					description: description,
					today: result[0][today]
				});
			});
		})
	}
}

function amazon(page) {
	if (typeof page === 'undefined') return Promise.reject(404);

	return new Promise((resolve, reject) => {
		fs.readFile(path.join(process.env.DATA_DIR, 'amazon', page + '.json'), (err, data) => {
			if (err) {
				if (err.code === 'ENOENT') return reject('404');
				return reject(err);
			}
			resolve(JSON.parse(data));
		});
	});
}
