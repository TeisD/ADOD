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
const Amazon = require('./controllers/Amazon');
const Test = require('./controllers/Test');

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
	case 'amazon':
		controller = new Amazon();
		break;
	default:
		controller = new Test();
		break;
}

var retry = 0;

lcd.print("Initializing...");

/**
 * Listen to status changes and display information to the user
 */
pagedetector.on('change', (e) => {
	if(e === PageDetector.STATUS.NO_PAGE) {
		lcd.clear();
		lcd.println(process.env.CONTROLLER.toUpperCase(), 1)
		lcd.println(LCD.MESSAGE.INSERT_PAGE, 2)
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
	// hacky language setting
	/*
	if(language == 1) {
		n = n + 'T';
	}
	*/
	
	let page = Page.find(pages, n);

	if(typeof page === "undefined") {
		lcd.print(LCD.MESSAGE.UNKNOWN_PAGE);
		return;
	};

	lcd.print('Page ' + n);
	console.log('<Index> Processing page ' + n);


	// stop the pagedetector
	pagedetector.stop();

	// reset the retry counter
	retry = 0;

	// make a request to the server for data
	lcd.print(LCD.MESSAGE.SEARCHING);
	getData(n)
	.then((data) => { // draw the data
		piezo.beep(Piezo.BEEPS.OK);
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
		piezo.beep(Piezo.BEEPS.OK);
		if(!process.env.DEBUGGING) {
			return printer.printAndFinish(controller.getBuffer());
		} else {
			return printer.save(controller.getBuffer(), path.join(process.env.DATA_DIR, '/tests/'+page.number+'-'+Date.now()+'.pdf'));
		}
	})
	.then((data) => { // resume the pageDetector
		if(!process.env.DEBUGGING) {
			let timeout = 25000;
			if(process.env.CONTROLLER == 'instagram') timeout = 40000
			setTimeout(function(){
				lcd.print(LCD.MESSAGE.DONE);
				piezo.beep(Piezo.BEEPS.OK);
				pagedetector.start()
			}, timeout);
		} else {
			if(process.env.UNIT_TESTS) test();
		}
	})
	.catch((err) => { // catch the error & resume after timeout
		if(process.env.DEBUGGING) {
			console.log('[ERROR]' + err);
			console.error('Stack trace: ' + err.stack);
		} else {
			console.error('[ERROR] ' + err);
			console.error('Stack trace: ' + err.stack);
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
				url = 'instagram';
				data = {page: pagenumber};
				break;
			case 'salone':
				url = 'salone';
				data = {page: pagenumber};
				break;
			case 'twitter':
				url = 'twitter';
				data = {page: pagenumber};
				break;
			case 'fuorisalone':
				url = 'fuorisalone';
				data = {page: pagenumber};
				break;
			case 'amazon':
				url = 'amazon';
				data = {page: pagenumber};
				break;
			default:
				data = {page: pagenumber};
				url = 'pages';
				break;
		}

		data.key = process.env.API_KEY;

		if(process.env.OFFLINE) {
			resolve(fs.readFileSync(path.join(process.env.DATA_DIR, url, pagenumber + '.json')).toString());
		} else {
			request.post({
				url: process.env.HOSTNAME + '/' + url,
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
						console.log(err);
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
		}
	});
}


let pageCount = 0,
		iteration = 0;

function test() {
	console.log("[DEBUG] Starting unit tests")
	if(pageCount < pages.length) {
		let page = pages[pageCount];
		console.log('-----------------------');
		console.log('[TEST] Page ' + page.number + ' / Iteration ' + (iteration + 1));
		pagedetector.emit('ready', page.number);
		iteration++;
		if(iteration > process.env.UNIT_TESTS - 1) {
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
	if(process.env.UNIT_TESTS) test();
	else pagedetector.emit('ready', parseInt(process.env.TEST_PAGE));
}
