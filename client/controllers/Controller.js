const fs = require('fs');
const path = require('path');
const Canvas = require('canvas')
const Image = Canvas.Image;
const Font = Canvas.Font;
const he = require('he');
const dotenv = require('dotenv');
const request = require('request');
const mkdirp = require('mkdirp');
const moment = require('moment');


dotenv.config();

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
		this.fonts = [
			new Font('Space Mono', path.join(__dirname, '../../shared/assets/fonts/SpaceMono-Regular.ttf')),
			new Font('Wingdings', path.join(__dirname, '../../shared/assets/fonts/Wingdings.ttf')),
			new Font('Agipo', path.join(__dirname, '../../shared/assets/fonts/Agipo-Regular.ttf')),
			new Font('Genath', path.join(__dirname, '../../shared/assets/fonts/Genath-Regular.otf'))
		]
		//registerFont(path.join(__dirname, '../../shared/assets/fonts/SpaceMono-Regular.ttf'), {family: 'SpaceMono'});
		//registerFont(path.join(__dirname, '../../shared/assets/fonts/Wingdings.ttf'), {family: 'Wingdings'});
	}

	/**
	 * Load the page
	 */
	load(page) {
		this.page = page;
		//this.canvas = Canvas.createCanvas(page.width, page.height, 'pdf');
		this.canvas = new Canvas(page.width, page.height, 'pdf');
		this.ctx = this.canvas.getContext('2d');
		this.fonts.forEach(font => {
			this.ctx.addFont(font);
		});

		if (process.env.DEBUGGING) {
			var bg = path.join(process.env.DATA_DIR, 'pages-pre', this.page.number + '.png');
			this.drawImage(bg, 0, 0, this.page.width, this.page.height);
		}

		//this.ctx.translate(this.page.offset.x, this.page.offset.y);
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
	 * If no filename is defined it will be saved as author-pagenumber.pdf in the current working dir
	 */
	savePNG(filename) {
		if (typeof filename === 'undefined') {
			filename = this.page.author.replace(/[^a-z0-9]/gi, '') + "-" + this.page.number + '.png';
		}
		var img = this.getImage();
		fs.writeFileSync(filename, new Buffer(img, 'base64'), (err) => {
			if (err) console.error('[ERROR] ' + err);
		});
	}

	/**
	 * Save the image
	 * If no filename is defined it will be saved as author-pagenumber.pdf in the current working dir
	 */
	savePDF(filename) {
		if (typeof filename === 'undefined') {
			filename = this.page.author.replace(/[^a-z0-9]/gi, '') + "-" + this.page.number + '.pdf';
		}
		var img = this.getBuffer();
		fs.writeFileSync(filename, img, (err) => {
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
		img.src = fs.readFileSync(src);

		this.drawImageProp(img, x, y, width, height);
	}

	/**
	 * Draw an image on the page
	 * @param src The path to the file
	 * @param x The left coordinate of the image
	 * @param y The top coordinate of the image
	 * @param width The width of the container fit
	 * @param height The height of the container to fit
	 */
	drawImageInContainer(src, x, y, width, height) {
		if (!fs.existsSync(src)) {
			console.log('<Controller> File does not exist');
			return;
		}

		var img = new Image();
		img.dataMode = Image.MODE_MIME | Image.MODE_IMAGE; // Both are tracked
		img.src = fs.readFileSync(src);

		if(img.width / img.height > width / height) {
			let ch = height;
			height = img.height * (width / img.width);
			y += (ch - height) / 2;
		} else {
			let cw = width;
			width = img.width * (height / img.height);
			x += (cw - width) / 2;
		}

		this.drawImageProp(img, x, y, width, height);

	}

	/**
	 * Draw an image from a url on the page
	 * @param img The url to the file
	 * @param x The left coordinate of the image
	 * @param y The top coordinate of the image
	 * @param width The width of the image
	 * @param height The height of the image
	 * @param dirname The dirname where the file could be found
	 * @param hostname The hostname of the server where the image can be downloaded (optional, leave empty to download from ADOD server)
	 * @param inContainer Draw the image in a container, rather than by exact dimensions
	 * @param inCircle Clip the image in a circle
	 */
	drawImageFromUrl(img, x, y, width, height, dirname, hostname, inContainer, inCircle) {
		console.log('<Controller> Drawing ' + img);
		var filename = path.join(dirname, img);
		return new Promise((resolve, reject) => {
			// check if the file exists already
			fs.readFile(filename, (err, data) => {
				if (err && err.code === 'ENOENT') {
					console.log('<Controller> Downloading from server');

					let callback = (error, response, body) => {
						if(!error && response.statusCode === 200) {
							mkdirp(path.dirname(filename), (err) => {
								if(err) {
									console.log('[ERROR] ' + err);
									return resolve();
								}
								fs.writeFile(filename, body, 'binary', (err) => {
									if(!err) {
										console.log('<Controller> Image saved');
										if(inContainer) this.drawImageInContainer(filename, x, y, width, height);
										if(inCircle) {
											this.ctx.save();
											this.ctx.arc(x+width, y+width, width, 0, 2 * Math.PI, true);
											this.ctx.clip();
											this.drawImage(filename, x, y, width*2, height*2);
											this.ctx.closePath();
											this.ctx.restore();
										}
										else this.drawImage(filename, x, y, width, height);
									}
									return resolve();
								});
							});
						} else {
							return resolve();
						}
					}

					if(typeof hostname === 'undefined') {
						request.post({
							url: process.env.HOSTNAME + '/image',
							form: {
								key: process.env.API_KEY,
								image: img,
							},
							encoding: null
						}, callback);
					} else {
						request.get({
							url: hostname + img,
							encoding: 'binary'
						}, callback);
					}

				} else if (err) {
					return resolve();
				} else {
					console.log('<Controller> Found local copy ' + filename);
					if(inContainer) this.drawImageInContainer(filename, x, y, width, height);
					if(inCircle) {
						this.ctx.save();
						this.ctx.arc(x+width, y+width, width, 0, 2 * Math.PI, true);
						this.ctx.clip();
						this.drawImage(filename, x, y, width*2, height*2);
						this.ctx.closePath();
						this.ctx.restore();
					}
					else this.drawImage(filename, x, y, width, height);
					return resolve();
				}
			});
			// if not, download it
		});
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
		console.log('<Controller> Done drawing image');
	}

	drawText(text, x, y, size, width, font, lineheight, stroke) {
		if (typeof font === 'undefined') {
			this.ctx.font = `bold ${size}pt Arial`;
		} else {
			this.ctx._setFont('normal', 'normal', size, 'px', font);
		}
		if (typeof lineheight === 'undefined') lineheight = size;
		let lines = [],
			line = '';
		if(typeof width !== 'undefined'){
			he.decode(text).split(/\s/).forEach((word) => {
				let w = this.ctx.measureText(line + ' ' + word).width;
				if (w > width + 10) {
					lines.push(line);
					line = '';
				}
				line += ' ' + word;
			});
			lines.push(line);
		} else {
			lines.push(text);
		}

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

		return lines.length*lineheight;
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

	timestamp(message, offset) {
		if(this.page.layout.fixed && this.page.layout.fixed.extra) {

			console.log(this.page.layout.fixed.extra);

			let bbox = this.page.layout.fixed.extra[0]

			this.drawText(`${message} ${moment().format('DD/MM/YYYY HH:mm:SS')}`, bbox.x, bbox.y + offset, 8, bbox.width, 'Agipo', 8);
		}
	}

}

module.exports = Controller;
