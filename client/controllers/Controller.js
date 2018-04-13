const fs = require('fs');
const path = require('path');
const Canvas = require('canvas');
const Image = Canvas.Image;
const he = require('he');

const DATA_DIR = '../../../mdw-2018-data/';

class Controller {

	/**
	 * Constructor
	 * @param page A Page instance
	 * @param data The data to add to the page
	 */
	constructor() {
		this.page,
			this.canvas,
			this.ctx;
		//Canvas.registerFont(path.join(__dirname, '../../shared/assets/fonts/Pecita.otf'), {family: 'Pecita', weight: 'book'});
	}

	/**
	 * Load the page
	 */
	load(page) {
		this.page = page;
		this.canvas = Canvas.createCanvas(page.width, page.height, 'pdf');
		this.ctx = this.canvas.getContext('2d');

		if (process.env.DEBUGGING) {
			var bg = path.join(__dirname, DATA_DIR, 'pages-pre', this.page.number + '.png');
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
		if (!fs.existsSync(src)) {
			console.log('<Controller> File does not exist');
			return;
		}

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

	drawText(text, x, y, size, width, font, lineheight, stroke) {
		if (typeof font === 'undefined') {
			this.ctx.font = `bold ${size}pt Arial`;
		} else {
			this.ctx.font = `${size}pt ${font}`;
		}
		if (typeof lineheight === 'undefined') lineheight = size;
		let lines = [],
			line = '';
		he.decode(text).split(/\s/).forEach((word) => {
			let w = this.ctx.measureText(line + ' ' + word).width;
			if (w > width + 10) {
				lines.push(line);
				line = '';
			}
			line += ' ' + word;
		});
		lines.push(line);

		if (typeof stroke !== 'undefined') {
			this.ctx.strokeStyle = "#ffffff";
			this.ctx.lineWidth = stroke;
			this.ctx.lineJoin = 'round';
			lines.forEach((line, i) => {
				this.ctx.strokeText(line, x, y + i * lineheight);
			});
		}


		lines.forEach((line, i) => {
			this.ctx.fillText(line, x, y + i * lineheight);
		});
	}

	drawArrow(fromx, fromy, tox, toy) {
		this.ctx.strokeStyle = "#000000";
		this.ctx.lineWidth = .5;
		var headlen = 5; // length of head in pixels
		var angle = Math.atan2(toy - fromy, tox - fromx);
		this.ctx.moveTo(fromx, fromy);
		this.ctx.quadraticCurveTo((fromx + tox) / 2, toy, tox, toy);
		this.ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
		this.ctx.moveTo(tox, toy);
		this.ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
		this.ctx.stroke();
	}

	drawHandCircle(cx, cy, rx, ry, rounds) {

		rounds = rounds ? rounds : 3;

		var x, y,
			tol = Math.random() * 2 + 2, //Math.random() * 5 + 5,
			dx = Math.random() * tol * 0.75,
			dy = Math.random() * tol * 0.75,
			ix = (Math.random() - 1) * 0.5,
			iy = (Math.random() - 1) * 0.3,
			rx = rx + Math.random() * tol,
			ry = ry + Math.random() * tol,
			a = 0,
			ad = 3,
			i = 0,
			start = Math.random() + 50,
			tot = 360 * rounds + Math.random() * 50 - 100,
			deg2rad = Math.PI / 180,
			points = [],
			rotate = 0; //Math.random() * 0.5;

		this.ctx.save();
		this.ctx.translate(cx, cy);
		this.ctx.rotate(-rotate);
		this.ctx.translate(-cx, -cy);

		for (; i < tot; i += ad) {
			dx += ix;
			dy += iy;

			if (dx < -tol || dx > tol) ix = -ix;
			if (dy < -tol || dy > tol) iy = -iy;

			x = cx + (rx + dx * 2) * Math.cos(i * deg2rad + start);
			y = cy + (ry + dy * 2) * Math.sin(i * deg2rad + start);

			points.push(x, y);

			ad = Math.random() * 4 + 2;
		}

		i = 2;

		this.ctx.beginPath();
		this.ctx.moveTo(points[0], points[1]);
		while (i < points.length) {
			this.ctx.lineTo(points[i], points[i + 1]);
			this.ctx.stroke();
			this.ctx.beginPath();
			this.ctx.moveTo(points[i], points[i + 1]);
			i += 2;
		}
		this.ctx.restore();
	}

	drawScribble(x0, y0, x1, y1, height) {
		var x = x0,
				y = y0 - height / 2,
				dx = 1,
				randx = 4,
				randy = 1,
				dir = 1;

		this.ctx.lineJoin = 'round';
		this.ctx.beginPath();
		this.ctx.moveTo(x, y);

		while(x < x1) {
			x += dx + dx*dir + Math.floor((Math.random() * randx));
			y = y0 + dir * height/2  -randy + Math.floor((Math.random() * 2 * randy));
			this.ctx.lineTo(x, y);
			// reverse the direction
			dir = -dir;
		}
		this.ctx.stroke();
	}

}

module.exports = Controller;
