// add a stop method to not check the page during processing
// add a start method to resume the checking

const Tesseract = require('tesseract.js')
const path = require('path');
const cv = require('opencv');
const fs = require('fs');
const LCD = require('../modules/LCD');
const Raspistill = require('node-raspistill').Raspistill;
const events = require('events');

const STATUS = {
	NO_PAGE: {
		id: 0,
		msg: "No page detected"
	},
	FOUND_PAGE:  {
		id: 1,
		msg: "Page detected"
	},
	UNKNOWN_PAGE:  {
		id: 2,
		msg: "The detected page is unknown"
	},
	KNOWN_PAGE:  {
		id: 3,
		msg: "The detected page is known"
	},
}

const CROP = {
	top: 1000,
	left: 800,
	width: 700,
	height: 700,
}
const AREA = 15000;

const PAGENUMBERS = [169, 185, 245, 249];

/*
 * Continously scans for pages
 * @emit 'new' When a new page is detected
 * @emit 'change' When a status change occurs
 * @emit 'ready' When a page has sucessfully been detected
 * @emit 'error' When an error occurs
 */
class PageDetector extends EventEmitter {

	constructor() {
		this.tesseract = Tesseract.create({
			langPath: path.join(__dirname, '../../assets/languages/'),
			corePath: path.join(__dirname, '../../node_modules/tesseract.js/src/index.js'),
		});
		this.camera = new Raspistill({
			noFileSave: true,
			width: 2000,
			time: 0,
		});
		this.pagenumber = 0;
		this.running = false;
		this.status = STATUS.NO_PAGE;
	}

	/*
	 * Start detecting pages
	 */
	function start() {
		this.running = true;
		capture();
	}

	/*
	 * Stop detecting pages
	 */
	function stop() {
		this.running = false;
		this.status = STATUS.NO_PAGE;
	}

	function capture() {
		if(!this.running) return;

		console.log('Capturing image...');
		this.camera.takePhoto()
		.then((photo) => {
			return new Promise((resolve, reject) => {
				cv.readImage(photo, function (err, im) {
					if (err) return reject(err);
					if (im.width() < 1 || im.height() < 1) return reject('Captured image has no size');
					console.log('[OK] Captured image');

					im = findPagenumber(im);

					resolve(im);
				});
			});
		})
		.then((image) => {
			return this.tesseract.recognize(image, {
				lang: 'eng',
				tessedit_char_whitelist: '0123456789'
			})
		})
		.then((n) => {
			if(!this.running) return;

			n = parseInt(n.text.trim());

			if(!n || isNaN(n) || n < 0 || n > 300) {
				return Promise.reject(STATUS.NO_PAGE)
			} else if(PAGENUMBERS.indexOf(n) < 0) {
				return Promise.reject(STATUS.UNKNOWN_PAGE)
			} else if(n == this.pagenumber) {
				// do nothing
			} else {
				this.pagenumber = n;
				this.status = STATUS.FOUND_PAGE;
				this.emit('new', this.pagenumber);
			}

			capture();
		})
		.catch((err) => {
			if(!this.running) return;

			if(err === this.status) return;

			let status = STATUS.NO_PAGE;

			switch(err) {
				case STATUS.NO_PAGE:
					this.emit('change', STATUS.NO_PAGE);
					break;
				case STATUS.FOUND_PAGE:
					this.emit('change', STATUS.FOUND_PAGE);
					break;
				case STATUS.UNKNOWN_PAGE:
					this.emit('change', STATUS.UNKNOWN_PAGE);
					break;
				default:
					this.emit('error', err);
					break;
			}

			this.STATUS = status;
			this.pagenumber = 0;
			capture();
		});
	}

	function findPagenumber(im) {
		im.convertGrayscale();
		im = im.crop(CROP.left, CROP.top, CROP.width, CROP.height);
		im = im.threshold(100, 255);

		var _im = im.copy();

		im.erode(35);

		var contours = im.findContours();
		var id = 0;
		var difference = +Infinity;

		if(!contours.size()) {
			return Promise.reject(STATUS.NO_PAGE);
		}

		for (let i = 0; i < contours.size(); i++) {
			var d = Math.abs(contours.area(i) - AREA);
			if(d < difference) {
				difference = d;
				id = i;
			}
		}

		if(contours.area(id) > AREA + 5000 || contours.area(id) < AREA - 5000) {
			return Promise.reject(STATUS.NO_PAGE);
		}

		if(this.status !== STATUS.FOUND_PAGE || this.status !== STATUS.KNOWN_PAGE) {
			this.emit('new');
		}

		var bbox = contours.boundingRect(id);
		_im = _im.crop(bbox.x, bbox.y, bbox.width, bbox.height)

		return _im.toBuffer();
	}

	static get STATUS() {
		return STATUS;
	}

}

module.exports = PageDetector;
