// add a stop method to not check the page during processing
// add a start method to resume the checking

const Tesseract = require('tesseract.js');
const dotenv = require('dotenv');
const path = require('path');
const cv = require('opencv');
const fs = require('fs');
const Raspistill = require('node-raspistill').Raspistill;
const EventEmitter = require('events');

dotenv.config();

const STATUS = {
	NO_PAGE: {
		id: 0,
		msg: "No page detected"
	},
	NEW_PAGE:  {
		id: 1,
		msg: "Page detected"
	},
	ERROR: {
		id: 2,
		msg: "An error occured"
	}
}

const CROP = {
	top: parseInt(process.env.CAM_CROP_TOP),
	left: parseInt(process.env.CAM_CROP_LEFT),
	width: parseInt(process.env.CAM_CROP_WIDTH),
	height: parseInt(process.env.CAM_CROP_HEIGHT),
}
const AREA = 15000;

const LANGPATH = path.join(__dirname, '../../shared/assets/languages/');
const COREPATH = path.join(__dirname, '../node_modules/tesseract.js-core/index.js');

/*
 * Continously scans for pages
 * @emit 'change' When a status change is detected (new / none)
 * @emit 'ready' When the pagenumber has been read
 * @emit 'error' When an error occurs
 */
class PageDetector extends EventEmitter {

	constructor() {
		super();
		this.tesseract = Tesseract.create({
			langPath: LANGPATH,
			corePath: COREPATH,
		});
		this.camera = new Raspistill({
			noFileSave: true,
			width: 2000,
			time: 1,
			contrast: 50,
		});
		this.pagenumber = 0;
		this.running = false;
		this.status = null;
	}

	/*
	 * Start detecting pages
	 */
	start() {
		this.running = true;
		this.capture();
	}

	/*
	 * Stop detecting pages
	 */
	stop() {
		this.running = false;
		this.pagenumber = 0;
		this.status = null;
	}

	/*
	 * Capture and process the page
	 */
	capture() {
		if(!this.running) return;

		//console.log('Capturing image...');
		this.camera.takePhoto()
		.then((photo) => {
			return new Promise((resolve, reject) => {
				cv.readImage(photo, (err, im) => {
					if (err) return reject(err);
					if (im.width() < 1 || im.height() < 1) return reject('Captured image has no size');
					//console.log('[OK] Captured image');
					if(!this.running) return Promise.reject();
					im = this.findPagenumber(im);

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
			} else if(n != this.pagenumber) {
				this.pagenumber = n;
				this.emit('ready', this.pagenumber);
			}

			this.capture();
		})
		.catch((err) => {
			if(!this.running) return;

			if(err === this.status) {
				return this.capture();
			};

			if(err === STATUS.NO_PAGE) {
				this.status = err
				this.emit('change', STATUS.NO_PAGE);
			} else {
				this.status = STATUS.ERROR;
				this.emit('error', err);
			}

			this.pagenumber = 0;
			this.capture();
		});
	}

	/**
	 * Find the area containing the pagenumber on an capture
	 * @param im An image
	 * @return The cropped image
	 */
	findPagenumber(im) {
		im.convertGrayscale();
		im.save('pre.jpg');
		im = im.crop(CROP.left, CROP.top, CROP.width, CROP.height);
		var _im = im.copy();
		im.save('mid.jpg');
		im = im.adaptiveThreshold(255, 1, 0, 10);
		im.save('mid-thresh.jpg');

		// remove noise
		im.dilate(2.5);
		im.erode(35);

		im.save('mid-erode.jpg');

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

		if(this.status !== STATUS.NEW_PAGE) {
			this.status = STATUS.NEW_PAGE;
			this.emit('change', STATUS.NEW_PAGE);
		}

		var bbox = contours.boundingRect(id);
		_im = _im.crop(bbox.x, bbox.y, bbox.width, bbox.height)
		_im = _im.threshold(190, 255);
		_im.save('post.jpg');

		return _im.toBuffer();
	}

	static get STATUS() {
		return STATUS;
	}

}

module.exports = PageDetector;
