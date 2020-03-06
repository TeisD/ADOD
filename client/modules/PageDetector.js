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
const AREA = parseInt(process.env.CAM_THRESH);

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
		});
		this.angle = 90;
		this.pagenumber = 0;
		this.pagelanguage = 0;
		this.running = false;
		this.status = null;
		this.try = 1;
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
		this.pagelanguage = 0;
		this.status = null;
		this.try = 1;
	}

	/*
	 * Capture and process the page
	 */
	capture() {
		if(!this.running) return;

		//console.log('<PD> Capturing image...');
		this.camera.takePhoto()
		.then((photo) => {
			console.log('<PD> Image captured');
			return new Promise((resolve, reject) => {
				cv.readImage(photo, (err, im) => {
					//console.log('<PD> Image read by opencv');
					if (err) return reject(err);
					if (im.width() < 1 || im.height() < 1) return reject('Captured image has no size');
					//console.log('[OK] Captured image');
					if(!this.running) return Promise.reject();
					//console.log('<PD> Page detection START');
					im = this.findPagenumber(im);
					//console.log('<PD> Page detection END');
					resolve(im);
				});
			});
		})
		.then((image) => {
			console.log('<PD> Image recognition START');
			return this.tesseract.recognize(image, {
				lang: 'eng',
				tessedit_char_whitelist: '1234567'
			})
		})
		.then((tess) => {
			if(!this.running) return;

			var symbol = tess.symbols.sort((a, b) => a.confidence > b.confidence)[0]

			var n = parseInt(symbol.text);
						
			if(!n || isNaN(n) || symbol.confidence < process.env.CAM_CONFIDENCE) {
;				if(this.try < 2) {
					if(process.env.DEBUGGING) console.log('<PD> Trying other orientation')
					this.try++;
					this.angle = -this.angle;
					this.capture();
					return Promise.resolve();
				} else {
					this.try = 1
					return Promise.reject(STATUS.NO_PAGE)
				}
			}

			if(n != this.pagenumber) {
				console.log(`<PD> Page: ${n}`);
				this.pagenumber = n;
				this.try = 1;
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
			this.pagelanguage = null;
			this.capture();
		});
	}

	/**
	 * Find the area containing the pagenumber on an capture
	 * @param im An image
	 * @return The cropped image
	 */
	findPagenumber(im) {
		let timestamp = Math.floor(new Date() / 1000);
		im.convertGrayscale();
		if(process.env.CALIBRATION_MODE) im.save(path.join(process.env.DATA_DIR, `calibration/${process.env.CONTROLLER}-${timestamp}-1-in.jpg`));
		im = im.crop(CROP.left, CROP.top, CROP.width, CROP.height);
		if(process.env.CALIBRATION_MODE) im.save(path.join(process.env.DATA_DIR, `calibration/${process.env.CONTROLLER}-${timestamp}-2-cropped.jpg`));
		//console.log('<PD> Threshold START');
		im = im.adaptiveThreshold(255, 0, 0, 25, 20);
		//console.log('<PD> Threshold END');
		if(process.env.CALIBRATION_MODE) im.save(path.join(process.env.DATA_DIR, `calibration/${process.env.CONTROLLER}-${timestamp}-3-threshold.jpg`));
		//console.log('<PD> Contour START');
		var _im = im.copy();

		// remove noise and erode
		im.dilate(2.5);
		im.erode(20);
		if(process.env.CALIBRATION_MODE) im.save(path.join(process.env.DATA_DIR, `calibration/${process.env.CONTROLLER}-${timestamp}-4-erode.jpg`));

		var contours = im.findContours();
		var id = 0;
		var difference = +Infinity;
		//console.log('<PD> Contour END');


		if(!contours.size()) {
			return Promise.reject(STATUS.NO_PAGE);
		}

		//console.log('<PD> Contour size: ' + contours.size());
		for (let i = 0; i < contours.size(); i++) {
			var d = Math.abs(contours.area(i) - AREA);
			if(d < difference) {
				difference = d;
				id = i;
			}
		}

		if(process.env.CALIBRATION_MODE) console.log(`Found contour: ${contours.area(id)} (countour size is ${AREA})`);

		if(contours.area(id) > AREA + 10000 || contours.area(id) < AREA - 10000) {
			return Promise.reject(STATUS.NO_PAGE);
		}

		if(this.status !== STATUS.NEW_PAGE) {
			this.status = STATUS.NEW_PAGE;
			this.emit('change', STATUS.NEW_PAGE);
		}

		var bbox = contours.boundingRect(id);
		_im = _im.crop(bbox.x + 25, bbox.y + 25, bbox.width - 50, bbox.height - 50);
		_im.rotate(this.angle);

		if(process.env.CALIBRATION_MODE) _im.save(path.join(process.env.DATA_DIR, `calibration/${process.env.CONTROLLER}-${timestamp}-5-out.jpg`));

		return _im.toBuffer();
	}

	static get STATUS() {
		return STATUS;
	}

}

module.exports = PageDetector;
