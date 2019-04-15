const Controller = require('./Controller');
const { Image } = require('canvas');
const path = require('path');
const _ = require('lodash');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

const DATA_DIR = path.join(process.env.DATA_DIR, 'instagram');

class Instagram extends Controller {

	constructor() {
		super();
	}

	draw(data) {
		console.log("<Instagram> Images");
		data = _.shuffle(data);

		this.page.layoutGrid();

		let queue = [];
		let areas = this.page.findWhitespaceAreas();

		/*
		this.page.layout.computed.forEach(row => {
			row.forEach(col => {
				if(!col.free) return;
				this.ctx.rect(col.x, col.y, col.size, col.size);
				this.ctx.stroke();
			})
		})
		*/

		// first make a random selection, but just the right size
		let selection = {
			left: [],
			right: []
		};

		for(let i = 0, j = 0; i < areas.length && j < data.length; i++, j++) {
			let a = areas[i];
			let d = data[j];

			if(this.getSide(d) == "left" && a.x > this.page.width / 2) {
				i--;
				continue;
			};
			if(this.getSide(d) == "right" && a.x < this.page.width / 2 - 100) {
				i--;
				continue;
			};

			if(this.getSide(d) == "right") selection.right.push(d);
			if(this.getSide(d) == "left") selection.left.push(d);
		}

		// sort it alphabetically
		selection.left.sort((a,b) => b.id - a.id);
		selection.right.sort((a,b) => b.id - a.id);
		areas.sort((a, b) => b.y - a.y);

		// then add
		for(let i = 0, left = 0, right = 0; i < areas.length && left < selection.left.length && right < selection.right.length; i++) {
			let a = areas[i];
			let d = []
			
			if(a.x > this.page.width / 2) {
				d = selection.right[right];
				right++
			} else {
				d = selection.left[left];
				left++
			}

			queue.push(
				this.drawImageFromUrl(
					d.image,
					a.x + 10 - Math.random() * 20,
					a.y + 10 - Math.random() * 20,
					a.width - 20 + Math.random() * 40,
					a.height - 20 + Math.random() * 40,
					path.join(DATA_DIR),
					undefined,
					true
				)
			);
		}

		// first the images, then the captions
		return Promise.all(queue).then(() => {
			console.log("<Instagram> Captions")
			for(let i = 0, left = 0, right = 0; i < areas.length && left < selection.left.length && right < selection.right.length; i++) {
				let a = areas[i];
				let d = []
				
				if(a.x > this.page.width / 2) {
					d = selection.right[right];
					right++
				} else {
					d = selection.left[left];
					left++
				}

				// draw the line
				let keyword = this.getKeyword(d);
				if(typeof keyword !== 'undefined') {
					this.ctx.fillStyle = 'rgba(0, 0, 0, .2)';
					this.ctx.fillRect(keyword.bbox.x0 - 2, keyword.bbox.y0 - 2, keyword.bbox.w + 4, keyword.bbox.h + 2);

					this.ctx.fillStyle = 'black';
					this.ctx.lineWidth = 1;
				}

				/*
				this.ctx.moveTo(keyword.bbox.x0, keyword.bbox.y0)
				this.ctx.lineTo(a.x, a.y);
				this.ctx.stroke();
				*/

				// caption
				let caption = d.caption;
				let textSize = Math.min(Math.max(0.2 / (caption.length/15) * a.width/1.3, 6), 15);

				this.drawText(
					caption,
					a.x + (5 - Math.floor(Math.random() * 10)),
					(textSize > 10) ? a.y + (Math.random() * a.height) + (10 - Math.floor(Math.random() * 30)) : a.y + a.height - 10,
					textSize,
					a.width + 10
				);
			}
		}).catch((err) => {
			console.log('[ERROR] ' + err)
			return Promise.resolve();
		})
	}

	getSide(hashtag) {
		for(let block of this.page.blocks) {
			let line = block.lines.find(l => l.text == hashtag.keyword);
			if(typeof line !== 'undefined') return block.side;
		}
		return 0;
	}

	getKeyword(hashtag) {
		for(let block of this.page.blocks) {
			let line = block.lines.find(l => l.text == hashtag.keyword);
			if(typeof line !== 'undefined') return line;
		}
	}

}

module.exports = Instagram;
