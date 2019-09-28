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

		this.timestamp("Last updated from Instagram on", 40)

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

			while(currentPos <= a.height - Math.min(a.width, a.height)) {

				let mode = Math.random();
				let captionMode = Math.random();

				let h = Math.min(a.height, a.width);

				if(mode < 0.25) {
					h = a.height - currentPos - 20;
				}

				if(typeof data[currentImage] !== 'undefined') {

					let i = Math.floor(Math.random() * data[currentImage].images.length) 

					queue.push(
						this.drawImageFromUrl(
							data[currentImage].images[i],
							a.x,
							a.y + currentPos,
							a.width,
							h,
							DATA_DIR
						)
					);

					currentPos += h;

					if(data[currentImage].captions.length && captionMode > 0.3) {
					
						let caption = data[currentImage].captions[Math.floor(Math.random() * data[currentImage].captions.length)]
						console.log(caption);
						
						let metaHeight = this.drawText(caption, a.x, a.y + currentPos + 10, 7, a.width, 'Agipo', 8);
						
						currentPos += metaHeight + 20;
					}
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
