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
		let forceShift = false;
		let prevShift = 0;

		for (let a of areas) {
			let currentPos = 0;

			while(currentPos <= a.height - Math.min(a.width, a.height)) {

				let sizeMode = Math.random();
				let shiftMode = Math.random();

				let size = a.width;
				let shift = 0;

				if(sizeMode < 0.75) {
					size = a.width * 0.8
					if(forceShift) {
						shift = prevShift > 0 ? 0 : a.width * 0.2
					} else {
						shift = shiftMode > 0.5 ? 0 : a.width * 0.2
					}
				} else {
					size = a.width
				}

				if(typeof data[currentImage] !== 'undefined') {

					queue.push(
						this.drawImageFromUrl(
							data[currentImage].image,
							a.x + shift,
							a.y + currentPos,
							size,
							size,
							DATA_DIR
						)
					);

					// draw the fig. x marker for the image

					currentPos += size;

					let id = data[currentImage].id;
					let x = a.x + shift - 5;
					let y = a.y + currentPos + 20;

					if(sizeMode < 0.75) {
						if(!forceShift) y -= size;

						if(shift) {
							x = a.x + 20;
						}
						else {
							x += size + 20;
						}
					} else {
						y += 5;
					}

					let w = this.drawText("fig. " + (currentImage + 1), x, y, 14, a.width - shift, 'Work Sans', 16, true).x;
								
					// draw the fig. x marker for the keyword

					let keypos = this.page.blocks[0].lines.find(line => line._id == id);

					if(typeof keypos !== 'undefined') {
						x = keypos.bbox.x0 - 60;
						y = keypos.bbox.y0 + 21;
						this.drawText("fig. " + (currentImage + 1), x, y, 14, a.width - shift, 'Work Sans', 16, true);
					}


					// draw the caption

					let caption = data[currentImage].caption

					if(data[currentImage].caption && data[currentImage].caption.length) {

						x = a.x + shift - 5;
						y = a.y + currentPos + 24;

						if(sizeMode >= 0.75) {
							x = x + w + 4;
						}
						
						let metaHeight = this.drawText(caption, x, y, 14, sizeMode >= 0.75 ? a.width - 50 : a.width - shift, 'Work Sans', 16, false).height;
						
						currentPos += metaHeight + 50;
					} else {
						if(sizeMode < 0.75) currentPos -= size * 0.2; // overlap the image
						else currentPos += 60;
						forceShift != forceShift;
						prevShift = shift;
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
