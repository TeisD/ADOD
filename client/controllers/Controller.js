const fs = require('fs');
const path = require('path');
const Canvas = require('canvas');
const Image = Canvas.Image;

const DATA_DIR = '../../../mdw-2018-data/';

class Controller {

	/**
	 * Constructor
	 * @param page A Page instance
	 * @param data The data to add to the page
	 */
	constructor() {
		this.page,
			this.data,
			this.canvas,
			this.ctx;
	}

	/**
	 * Load the page
	 */
	load(page, data) {
		this.page = page;
		this.data = data;
		this.canvas = new Canvas(page.width, page.height, 'pdf');
		this.ctx = this.canvas.getContext('2d');

		if(process.env.DEBUGGING) {
			var bg = path.join(__dirname, DATA_DIR, 'pages-pre', this.page.number+'.png');
			this.drawImage(bg, 0, 0, this.page.width, this.page.height);
		}
	}

	/**
	 * abstract method
	 * @return Promise - resolves after drawing has completed
	 */
	draw() {
		throw new Error('The abstract method draw has to be implemented');
	}

	/**
	 * Convert the canvas to an image
	 * @return The base64 encoded image data
	 */
	getImage() {
		return this.canvas.toDataURL().replace(/^data:image\/\w+;base64,/, "");
	}

	/**
	 * Convert the canvas to a buffer
	 * @return A pdf buffer
	 */
	getBuffer() {
		return this.canvas.toBuffer();
	}

	/**
	 * Save the image
	 * If no filename is defined it will be saved as author-pagenumber.png
	 */
	saveImage(filename) {
		if (typeof filename === 'undefined') {
			filename = this.text.author.replace(/[^a-z0-9]/gi, '') + "-" + this.page;
		}
		var img = this.getImage();
		fs.writeFile(__dirname + '/../../assets/images/' + filename + '.png', new Buffer(img, 'base64'), (err) => {
			if (err) console.error('[ERROR] ' + err);
		});
	}

	/**
	 * Draw an image on the page
	 * @param src The path to the file
	 * @param x The left coordinate of the image
	 * @param y The top coordinate of the image
	 * @param width The width of the image
	 * @param height The height of the image
	 */
	drawImage(src, x, y, width, height) {
		if (!fs.existsSync(src)) return;

		var img = new Image();
		img.dataMode = Image.MODE_MIME | Image.MODE_IMAGE; // Both are tracked
		img.src = src;

		this.drawImageProp(img, x, y, width, height);
	}

	/**
	 * By Ken Fyrstenberg Nilsen
	 *
	 * drawImageProp(context, image [, x, y, width, height [,offsetX, offsetY]])
	 *
	 * If image and context are only arguments rectangle will equal canvas
	 */
	drawImageProp(img, x, y, w, h, offsetX, offsetY) {

		if (arguments.length === 2) {
			x = y = 0;
			w = this.ctx.canvas.width;
			h = this.ctx.canvas.height;
		}

		// default offset is center
		offsetX = typeof offsetX === "number" ? offsetX : 0.5;
		offsetY = typeof offsetY === "number" ? offsetY : 0.5;

		// keep bounds [0.0, 1.0]
		if (offsetX < 0) offsetX = 0;
		if (offsetY < 0) offsetY = 0;
		if (offsetX > 1) offsetX = 1;
		if (offsetY > 1) offsetY = 1;

		var iw = img.width,
			ih = img.height,
			r = Math.min(w / iw, h / ih),
			nw = iw * r, // new prop. width
			nh = ih * r, // new prop. height
			cx, cy, cw, ch, ar = 1;

		// decide which gap to fill
		if (nw < w) ar = w / nw;
		if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh; // updated
		nw *= ar;
		nh *= ar;

		// calc source rectangle
		cw = iw / (nw / w);
		ch = ih / (nh / h);

		cx = (iw - cw) * offsetX;
		cy = (ih - ch) * offsetY;

		// make sure source rectangle is valid
		if (cx < 0) cx = 0;
		if (cy < 0) cy = 0;
		if (cw > iw) cw = iw;
		if (ch > ih) ch = ih;

		// fill image in dest. rectangle
		this.ctx.drawImage(img, cx, cy, cw, ch, x, y, w, h);
	}

	drawText(text, x, y, size, width, font, lineheight) {
		if(typeof font === 'undefined') {
			this.ctx.font = `bold ${size}pt Arial`;
		} else {
			this.ctx.font = `${size}pt ${font}`;
		}
		if(typeof lineheight === 'undefined') lineheight = size;
		let lines = [],
				line = '';
		text.split(' ').forEach((word) => {
			let w = this.ctx.measureText(line + ' ' + word ).width;
			if(w > width + 10) {
				lines.push(line);
				line = '';
			}
			line += ' ' + word;
		});
		lines.push(line);

		lines.forEach((line, i) => {
			this.ctx.fillText(line, x, y + i*lineheight);
		});
	}

}

module.exports = Controller;
