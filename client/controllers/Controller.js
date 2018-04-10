const fs = require('fs');
const Canvas = require('canvas');
const Image = Canvas.Image;

const PAGE_WIDTH = 842,
			PAGE_HEIGHT = 595;

const IMAGE_MODE = {
	NORMAL: 0,
	CROP: 1,
	REPEAT: 2
}

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
		fs.writeFile(__dirname + '/../../assets/images/'+filename+'.png', new Buffer(img, 'base64'), (err) => {
			if(err) console.error('[ERROR] ' + err);
		});
	}

	/**
	 * Draw an image on the page
	 * @param src The path to the file
	 * @param x The left coordinate of the image
	 * @param y The top coordinate of the image
	 * @param width The width of the image
	 * @param height The height of the image
	 * @param mode The IMAGE_MODE to use
	 */
	drawImage(src, x, y, width, height, mode) {
		if (!fs.existsSync(src)) return;

		var img = new Image();
		img.dataMode = Image.MODE_MIME | Image.MODE_IMAGE; // Both are tracked
		img.src = src
		this.ctx.drawImage(img, x, y, width, height)
	}

}

module.exports = Controller;
