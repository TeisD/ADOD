/*
 * Make sure mongodb is running
 * mongod --dbpath /assets/db
 */
const request = require('request');
const fs = require('fs');
const JSONStream = require( "JSONStream" );
const throttledRequest = require('throttled-request')(request);
const path = require('path');
const { JSDOM } = require('jsdom');
const { URL } = require('url');
var MongoClient = require('mongodb').MongoClient;

const DB = "mongodb://localhost:27017";
const IMAGES = path.join(__dirname, '../../data/salone/images');
const OUTPUT = path.join(__dirname, '../../data/salone');
const HOSTNAME = "http://www.salonemilano.it";
const ENDPOINTS = {
	"producers": "/en/site-salone/tools/catalogo-prodotti/platform/promos/0?ajax=true&currentPage=1",
	"products": "/en/site-salone/tools/catalogo-prodotti/catalogo-soluzioni/catalogo-lista-prodotti/platform/promos/0?ajax=true&currentPage=1&mId="
}

throttledRequest.configure({
  requests: 5,
  milliseconds: 1000
});

start();

function start() {
  const args = process.argv.slice(2);
	if(!args.length || args.includes('help')) {
		console.log('Unknown argument. Possible options are:');
		console.log('producers - Fetch all the producers');
		console.log('products - Fetch the products of each producer');
		console.log('details - Fetch the details of each product');
		console.log('images - Download the image of each product');
		console.log('export - Generate a JSON file for training');
	}
  if (args.includes('producers')) fetchProducers();
  if (args.includes('products')) fetchProducts();
	if (args.includes('details')) fetchDetails();
	if (args.includes('images')) fetchImages();
	if (args.includes('export')) exportJson();
}

function fetchProducers() {
	fetch(ENDPOINTS.producers, '.detail-prod-archi', parseProducer).then((data) => {
		MongoClient.connect(DB, function(err, db) {
			if (err) throw err;
			var dbo = db.db("salone");
			var update = data.map(function(doc) {
				return {
						"updateOne": {
								"filter": { "_id": doc.mId },
								"update": doc,
								"upsert": true
						}
				};
			});
			dbo.collection('producers').bulkWrite(update, function(err, res) {
				if (err) throw err;
				console.log("Number of documents inserted: " + res.upsertedCount);
				console.log("Number of documents updated: " + res.modifiedCount);
				db.close();
			});
		});
	}).catch((err) => {
		console.error("[ERROR] " + err);
	})
}

function fetchProducts() {
	MongoClient.connect(DB, function(err, db) {
		if (err) throw err;
		var dbo = db.db("salone");
		dbo.collection("producers").find({}).toArray(function(err, result) {
			if (err) throw err;
			var promises = result.map((p, i) => new Promise((resolve, reject) => {
				setTimeout(function(){
					fetch(ENDPOINTS.products + p.mId, '.detail-prod-archi', parseProduct, {
						"producer": p.name
					}).then((data) => {
						var update = data.map(function(doc) {
							return {
									"updateOne": {
											"filter": { "_id": doc.pId },
											"update": { $set: doc },
											"upsert": true
									}
							};
						});
						dbo.collection('products').bulkWrite(update, function(err, res) {
							if (err) reject(err);
							console.log("Number of documents inserted: " + res.upsertedCount);
							console.log("Number of documents updated: " + res.modifiedCount);
							resolve();
						});
					}).catch((err) => {
						console.error("[ERROR] for producer " + p.name + ": " + err);
						resolve();
					});
				}, i*1000);
			}));
			Promise.all(promises).then(() => {
				db.close();
			}).catch((err) => {
				db.close();
				throw err;
			});
		});
	});
}

function fetchDetails() {
	MongoClient.connect(DB, function(err, db) {
		if (err) throw err;
		var dbo = db.db("salone");

		dbo.collection("products").find({}).toArray(function(err, result) {
			if (err) throw err;

			var promises = result.map((p, i) => new Promise((resolve, reject) => {
				setTimeout(function(){
					request(HOSTNAME + p.url, (err, res, body) => {
						console.log('Fetched '+i+'/' + result.length);
						if (err) reject(err);

						let dom = new JSDOM(body);
						let el = dom.window.document.getElementById('home');
						let images = el.querySelectorAll('.archiProd img');
						images = Array.from(images).map(img => img.getAttribute('src'));
						let description = el.getElementsByTagName('p');
						description = description[description.length - 1].textContent;
						let designer = dom.window.document.querySelector('#menu1 b');
						designer = (designer !== null) ? designer.textContent.trim() : '';
						dom.window.close();
						var update = {
							"updateOne": {
									"filter": { "_id": p._id },
									"update": { $set: {
										images: images,
										description: description,
										designer: designer
									}},
									"upsert": true
							}
						}
						resolve(update);
					});
				}, i * 100);
			}));

			let callback = function(data) {
				return new Promise((resolve, reject) => {
					dbo.collection('products').bulkWrite(data, function(err, res) {
						if (err) reject(err)
						console.log("Storing " + data.length + " elements");
						console.log("Number of documents inserted: " + res.upsertedCount);
						console.log("Number of documents updated: " + res.modifiedCount);
						resolve();
					});
				})
			}

			batchResolve(promises, 100, callback).then((data) => {
				console.log('done!');
				db.close();
			}).catch((err) => {
				throw err;
			});

			//resolve the promises in batches of 100
			/*var _promises = [];
			while(promises.length > 0) {
				_promises.push(promises.splice(0, 100));
			}

			_promises = _promises.map(chain => {
				return new Promise((resolve, reject) => {
					Promise.all(chain).then((data) => {
						dbo.collection('products').bulkWrite(data, function(err, res) {
							if (err) reject(err)
							console.log("Storing " + data.length + " elements");
							console.log("Number of documents inserted: " + res.upsertedCount);
							console.log("Number of documents updated: " + res.modifiedCount);
							resolve();
						});
					}).catch((err) => {
						reject(err);
					});
				})
			});

			Promise.all(_promises).then((data) => {
				db.close();
			}).catch((err) => {
				throw err;
			});
			*/
		});
	});
}

function fetchImages() {
	MongoClient.connect(DB, function(err, db) {
		if (err) throw err;
		var dbo = db.db("salone");

		dbo.collection("products").find({}).toArray(function(err, result) {
			if (err) throw err;

			promises = [];

			result.forEach((product, i) => {
				product.images.forEach((image, j) => {
					let filename = path.join(IMAGES, image.substr(image.lastIndexOf('/') + 1));

					promises.push(new Promise((resolve, reject) => {
						fs.stat(filename, function(err, stat) {
							if((err && err.code == 'ENOENT')) {
								let request = throttledRequest(image)
									.on('response', function(response) {
										if(response.statusCode == 200 && response.headers['content-type'].indexOf('image') > -1){
											request.pipe(fs.createWriteStream(filename));
											request.on('finish', function() {
												console.log('Downloaded image '+(j+1)+'/'+product.images.length+' from product '+(i+1)+'/'+result.length);
												resolve();
											});
										} else {
											console.log('Invalid image '+(j+1)+'/'+product.images.length+' from product '+(i+1)+'/'+result.length);
											resolve();
										}
									})
									.on('error', reject);
							} else if(err) {
								reject();
							} else {
								console.log('Skipping image '+(j+1)+'/'+product.images.length+' from product '+(i+1)+'/'+result.length);
								resolve();
							}
						});
					}));
				});
			});

			Promise.all(promises).then(() => {
				db.close();
			}).catch((err) => {
				db.close();
				throw err;
			});

		});
	});
}

function exportJson() {
	var transformStream = JSONStream.stringify();
	var outputStream = fs.createWriteStream( OUTPUT + "/data.json" );
	transformStream.pipe( outputStream );

	MongoClient.connect(DB, function(err, db) {
		if (err) throw err;
		var dbo = db.db("salone");

		dbo.collection("products").find({}).toArray(function(err, result) {
			if (err) throw err;

			promises = [];

			result.forEach((product, i) => {
				if(!product.description) return;
				let captions = [];

				product.images.forEach((image, j) => {
					let filename = image.substr(image.lastIndexOf('/') + 1)

					promises.push(new Promise((resolve, reject) => {
						fs.stat(path.join(IMAGES, filename), function(err, stat) {
							if(err && err.code == 'ENOENT') return resolve();
							if(err) reject(err);
							// only build the description once
							if(captions.length == 0) {
                captions = product.description.split(/[\.!?\n]/);
                let name = product.name.split(' ')[0]; // first word of the title
                name = name.split(''); // split into characters
                name = name.map(c => c.toLowerCase()+c.toUpperCase());
                name = '[' + name.join('][') + ']';
                let project = new RegExp(name + "(\\s*[A-Z0-9]+[\\w]*)*", "g");
                let producer = new RegExp(product.producer, "gi");
                let designer = new RegExp(product.designer, "g");
                captions = captions.map(s => {
                  s = s.replace(/[^\w\s-:;,/'"]/g, '').trim();
                  s = s.replace(project, '%PROJECT%');
                  s = s.replace(producer, '%PRODUCER%');
                  if(product.designer) {
                    s = s.replace(designer, '%DESIGNER%');
                  }
                  return s;
                });
								captions = captions.filter(s => s);
							}
              if(captions.length == 0) return resolve();
							console.log('Writing caption '+(j+1)+'/'+product.images.length+' from product '+(i+1)+'/'+result.length);
							transformStream.write({
								file_path: 'images/' + filename,
								captions: captions
							});
							resolve();
						});
					}));
				});
			});

			Promise.all(promises).then(() => {
				db.close();
				transformStream.end();
			}).catch((err) => {
				db.close();
				throw err;
			});
		});
	});
}

/**
 * Parse function for the producers page
 */
function parseProducer(data) {
	let name = data.querySelector('h5').textContent;
	let url = data.getAttribute('href');
	let mId = new URL(HOSTNAME + url).searchParams.get('mId');
	return {
		"name": name,
		"url": url,
		"mId": mId
	}
}

/**
 * Parse function for the products page
 */
function parseProduct(data, args) {
	let name = data.querySelector('h5').textContent;
	let url = data.getAttribute('href');
	let mId = new URL(HOSTNAME + url).searchParams.get('mId');
	let pId = new URL(HOSTNAME + url).searchParams.get('pId');
	return {
		"name": name,
		"producer": args.producer,
		"url": url,
		"mId": mId,
		"pId": pId
	}
}

/**
 * Fetch data from url and execute the callback on each selected
 * @param url The URL to fetch
 * @param selector The elements to select
 * @param callback Callback to execute on each element
 */
function fetch(url, selector, callback, args) {
	let _data = [];

	return new Promise((resolve, reject) => {
		request(HOSTNAME + url, (err, res, body) => {
			if (err) reject(err);
			let dom = new JSDOM(body);
			parse(dom.window.document);
		});

		function parse(document) {
			let nodes = document.querySelectorAll(selector);
			//console.log('Found ' + nodes.length + ' items');
			nodes.forEach(node => {
				_data.push(callback(node, args));
			});
			let pagination = document.querySelector('.load-content');
			if(pagination) {
				fetch(pagination.getAttribute('data-url'), selector, callback, args).then((data) => {
					_data = _data.concat(data);
					resolve(_data);
				}).catch((err) => {
					reject(err);
				});
			} else {
				resolve(_data);
			}
		}
	});
}

/**
 * resolve promises in small batches
 * @param promises The array of promises to resolve
 * @param batchSize The size of one batch
 * @param callback The callback promise to execute on each batch
 */
function batchResolve(promises, batchSize, callback) {

	//split the array of promises in batches
	var _promises = [];
	while(promises.length > 0) {
		_promises.push(promises.splice(0, batchSize));
	}

	// execute the callback on each batch
	_promises = _promises.map(chain => {
		return new Promise((resolve, reject) => {
			Promise.all(chain).then((data) => {
				callback(data).then(() => {
					resolve();
				}).catch((err) => {
					reject(err);
				});
			}).catch((err) => {
				reject(err);
			});
		})
	});

	return Promise.all(_promises);
}
