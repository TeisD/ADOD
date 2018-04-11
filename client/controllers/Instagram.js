const Controller = require('./Controller');
const { Image } = require('canvas');
const path = require('path');
const _ = require('lodash');

const DATA_DIR = '../../../mdw-2018-data/instagram/';

class Instagram extends Controller {

	constructor() {
		super();
	}

	draw(data) {

		let areas;

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
							this.drawImage(
								path.join(__dirname, DATA_DIR, data[i].images[j]),
								x + 10,
								y + 10,
								GRID_SIZE - 20,
								GRID_SIZE - 20
							);
							j++;
						}
					}
				}
			} else {
				this.drawImage(
					path.join(__dirname, DATA_DIR, data[i].images[0]),
					a.x + 10,
					a.y + 10,
					a.width - 20,
					a.height - 20
				);
			}
		});

		areas.forEach((a, i) => {
			if(typeof data[i] === 'undefined') return;
			if(data[i].captions.length < 1) return;
			let caption = data[i].captions[Math.floor(Math.random() * data[i].captions.length)]
			let textSize = Math.max(0.2 / (caption.length/15) * a.width/1.3, 6);
			this.drawText(
				caption,
				a.x + (5 - Math.floor(Math.random() * 10)),
				(textSize > 10) ? a.y + (Math.random() * a.height) + (10 - Math.floor(Math.random() * 30)) : a.y + a.height - 10,
				textSize,
				a.width + 10
			);
		});

		return Promise.resolve();
	}

}

module.exports = Instagram;
