const Controller = require('./Controller');
const { Image } = require('canvas');
const path = require('path');
const _ = require('lodash');
const dotenv = require('dotenv');
const request = require('request');
const fs = require('fs');
const mkdirp = require('mkdirp');

dotenv.config();

const DATA_DIR = '../../../mdw-2018-data/instagram/';

class Instagram extends Controller {

	constructor() {
		super();
	}

	draw(data) {

		let areas,
				queue = [];

		if(typeof _.get(this.page, 'layout.fixed.images') !== 'undefined') {
			areas = this.page.layout.fixed.images
		} else {
			this.page.layoutGrid();
			areas = this.page.findWhitespaceAreas();
		}

		const GRID_SIZE = 100;

		areas.forEach((a, i) => {
			if(typeof data[i] === 'undefined') return;
			if(data[i].hasOwnProperty('all') && data[i].all) {
				let j = 0;
				for(let x = a.x; x < a.width; x+=GRID_SIZE) {
					for(let y = a.y; y < a.height; y+=GRID_SIZE) {
						if(j < data[i].images.length) {
							queue.push(
								this.drawImageFromUrl(
									data[i].images[j],
									x + 10,
									y + 10,
									GRID_SIZE - 20,
									GRID_SIZE - 20
								)
							);
							j++;
						}
					}
				}
			} else {
				queue.push(
					this.drawImageFromUrl(
						data[i].images[0],
						a.x + 10,
						a.y + 10,
						a.width - 20,
						a.height - 20
					)
				);
			}
		});

		// first the images, then the captions
		return Promise.all(queue).then(() => {
			areas.forEach((a, i) => {
				if(typeof data[i] === 'undefined') return;
				if(data[i].captions.length < 1) return;
				let caption = data[i].captions[Math.floor(Math.random() * data[i].captions.length)]
				let textSize = Math.min(Math.max(0.2 / (caption.length/15) * a.width/1.3, 6), 100);
				this.drawText(
					caption,
					a.x + (5 - Math.floor(Math.random() * 10)),
					(textSize > 10) ? a.y + (Math.random() * a.height) + (10 - Math.floor(Math.random() * 30)) : a.y + a.height - 10,
					textSize,
					a.width + 10
				);
			});
		}).catch((err) => {
			return Promise.resolve();
		})
	}

	/**
	 * Draw an image from a url on the page
	 * @param img The url to the file
	 * @param x The left coordinate of the image
	 * @param y The top coordinate of the image
	 * @param width The width of the image
	 * @param height The height of the image
	 */
	drawImageFromUrl(img, x, y, width, height) {
		console.log('<Instagram> ' + img);
		var filename = path.join(__dirname, DATA_DIR, img);
		return new Promise((resolve, reject) => {
			// check if the file exists already
			fs.readFile(filename, (err, data) => {
				if (err && err.code === 'ENOENT') {
					console.log('<Instagram> Downloading from server');
					request.post({
						url: process.env.HOSTNAME + '/image',
						form: {
							key: process.env.API_KEY,
							image: img,
						},
						encoding: null
					}, (error, response, body) => {
						if(!error && response.statusCode === 200) {
							mkdirp(path.dirname(filename), (err) => {
								if(err) return reject(err);
								console.log('created directory');
								fs.writeFile(filename, body, 'binary', (err) => {
									if(!err) {
										console.log('<Instagram> Image saved');
										this.drawImage(filename, x, y, width, height);
									}
									resolve();
								});
							});
						}
					});
				} else if (err) {
					resolve();
				} else {
					console.log('<Instagram> Found local copy');
					this.drawImage(filename, x, y, width, height);
					resolve();
				}
			});
			// if not, download it
		});
	}

}

module.exports = Instagram;
