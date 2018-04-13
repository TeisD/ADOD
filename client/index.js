const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const request = require('request');

const Piezo = require('./modules/Piezo');
const LCD = require('./modules/LCD');
const Page = require('../shared/modules/Page');
const PageDetector = require('./modules/PageDetector');
const Printer = require('./modules/Printer');
const Controller = require('./controllers/Controller');
const Instagram = require('./controllers/Instagram');
const Salone = require('./controllers/Salone');
const Twitter = require('./controllers/Twitter');
const Fuorisalone = require('./controllers/Fuorisalone');

dotenv.config();

var lcd = new LCD();
var pagedetector = new PageDetector();
var pages = Page.loadFolder(path.join(process.env.DATA_DIR, 'pages'));
var printer = new Printer(process.env.PRINTER);
var piezo = new Piezo(12);
var controller;
switch(process.env.CONTROLLER){
	case 'instagram':
		controller = new Instagram();
		break;
	case 'salone':
		controller = new Salone();
		break;
	case 'twitter':
		controller = new Twitter();
		break;
	case 'fuorisalone':
		controller = new Fuorisalone();
		break;
	default:
		controller = new Controller();
		break;
}

var retry = 0;

lcd.print("Initializing...");

/**
 * Listen to status changes and display information to the user
 */
pagedetector.on('change', (e) => {
	if(e === PageDetector.STATUS.NO_PAGE) {
		lcd.print(LCD.MESSAGE.INSERT_PAGE)
	} else if (e === PageDetector.STATUS.NEW_PAGE) {
		piezo.beep(Piezo.BEEPS.OK);
		lcd.print(LCD.MESSAGE.PAGE_DETECTED);
	}
	console.log('[EVENT] ' + e.msg);
});

/**
 * Process the detected page
 */
pagedetector.on('ready', function(n) {
	let page = Page.find(pages, n);

	if(typeof page === "undefined") {
		lcd.print(LCD.MESSAGE.UNKNOWN_PAGE);
		return;
	};

	lcd.print('Page ' + n);

	// stop the pagedetector
	pagedetector.stop();

	// reset the retry counter
	retry = 0;

	// make a request to the server for data
	lcd.print(LCD.MESSAGE.SEARCHING);
	getData(n)
	.then((data) => { // draw the data
		if(typeof data === 'undefined') {
			lcd.print(LCD.MESSAGE.NO_DATA);
			controller.load(page);
			return new Promise((res, rej) => {
				setTimeout(res, 3000)
			});
		} else {
			data = JSON.parse(data);
			console.log('<Index> Received ' + data.length + ' links');
			lcd.print(LCD.MESSAGE.DRAWING);
			controller.load(page);
			return controller.draw(data);
		}
	})
	.then(() => { // print page & wait for print to finish
		lcd.print(LCD.MESSAGE.PRINTING)
		if(!process.env.DEBUGGING) {
			return printer.printAndFinish(controller.getBuffer());
		} else {
			return printer.save(controller.getBuffer(), '../../mdw-2018-data/responses/'+page.number+'-'+Date.now()+'.pdf');
		}
	})
	.then((data) => { // resume the pageDetector
		setTimeout(function(){
			lcd.print(LCD.MESSAGE.DONE);
			pagedetector.start()
		}, 10000);
		//test();
	})
	.catch((err) => { // catch the error & resume after timeout
		if(process.env.DEBUGGING) {
			console.log(err);
			console.error(err.stack);
		} else {
			console.error('[ERROR] ' + err);
			piezo.beep(Piezo.BEEPS.ERROR);
			lcd.print(LCD.MESSAGE.ERROR_RETRY);
			setTimeout(function(){
				pagedetector.start()
			}, 5000);
		}
	})
});

/**
 * Log error messages
 */
pagedetector.on('error', (err) => {
	console.error('[ERROR] ' + err);
});

function getData(pagenumber) {
	return new Promise((resolve, reject) => {

		let url,
				data;

		switch(process.env.CONTROLLER.toLowerCase()){
			case 'instagram':
				url = process.env.HOSTNAME + '/instagram';
				data = {page: pagenumber};
				break;
			case 'salone':
				url = process.env.HOSTNAME + '/salone';
				data = {page: pagenumber};
				break;
			case 'twitter':
				url = process.env.HOSTNAME + '/twitter';
				data = {page: pagenumber};
				break;
			case 'fuorisalone':
				url = process.env.HOSTNAME + '/fuorisalone';
				data = {page: pagenumber};
				break;
			default:
				return reject('Unknown controller')
				break;
		}

		data.key = process.env.API_KEY;

		///*
		request.post({
			url: url,
			form: data,
			timeout: 40000
		}, (err, response, body) => {
			if(err) {
				if(retry < parseInt(process.env.MAX_RETRY)) {
					if(err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
						lcd.printVar(LCD.MESSAGE.TIMEOUT_RETRY, retry + 1);
					} else {
						lcd.printVar(LCD.MESSAGE.SERVER_RETRY, retry + 1);
					}
					retry++;
					console.log('<Index> Server error, retrying');
					return resolve(getData(pagenumber));

				} else {
					if(err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
						lcd.print(LCD.MESSAGE.TIMEOUT_PROCEED);
					} else {
						lcd.print(LCD.MESSAGE.SERVER_PROCEED);
					}
					console.log('<Index> Server error, proceeding');
					return resolve();
				}
			}
			switch(response.statusCode) {
				case 200:
					console.log('<Index> Server responded 200');
					resolve(body);
					break;
				case 404:
					console.log('<Index> Server responded 404');
					resolve();
					break;
				default:
					reject('Server responded with statuscode: ' + response.statusCode);
			}
		});
		//*/

		// DEBUGGING
		//resolve(JSON.parse(fs.readFileSync('../../mdw-2018-data/responses/instagram/' + pagenumber + '.json')));
		//resolve({});
	});
}


let pageCount = 0,
		iteration = 0;

function test() {

	if(pageCount < pages.length) {
		let page = pages[pageCount];
		console.log('-----------------------');
		pagedetector.emit('ready', page.number);
		iteration++;
		if(iteration > 3) {
			iteration = 0;
			pageCount++
		}
	}
}

/*
 * Start!
 */
if(!process.env.DEBUGGING) {
	pagedetector.start();
} else {
	pagedetector.emit('ready', 153);
	//test();
}
