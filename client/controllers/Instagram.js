const Controller = require('./Controller');
const { Image } = require('canvas');
const path = require('path');
const _ = require('lodash');
const dotenv = require('dotenv');
const request = require('request');
const fs = require('fs');
const mkdirp = require('mkdirp');

dotenv.config();

const DATA_DIR = path.join(process.env.DATA_DIR, 'instagram');

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

		let currentImage = 0;

		for (let a of areas) {
			let currentPos = 0;

			while(currentPos < a.height - a.width) {

				let mode = Math.random();

				let h = Math.min(a.height, a.width);

				if(mode < 0.1) {
					h = a.height - currentPos - 20;
				}

				queue.push(
					this.drawImageFromUrl(
						data[currentImage].images[0],
						a.x,
						a.y + currentPos,
						a.width,
						h,
						DATA_DIR
					)
				);

				currentPos += h;

				if(data[currentImage].captions.length && h < a.height) {
				
					let caption = data[currentImage].captions[Math.floor(Math.random() * data[currentImage].captions.length)]
					console.log(caption);
					
					let metaHeight = this.drawText(caption, a.x, a.y + currentPos + 10, 7, a.width, 'Agipo', 8);
					
					currentPos += metaHeight + 20;
				}

				currentImage++;

				if(currentImage >= data.length) break;

			}

		}

		// first the images, then the captions
		return Promise.all(queue);
	}

}

module.exports = Instagram;
