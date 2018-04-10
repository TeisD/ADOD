const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const request = require('request');

const LCD = require('./modules/LCD');
const Page = require('../shared/modules/Page');
const PageDetector = require('./modules/PageDetector');
const Printer = require('./modules/Printer');
const Controller = require('./controllers/Controller');
const Instagram = require('./controllers/Instagram');
const Salone = require('./controllers/Salone');

dotenv.config();

var lcd = new LCD();
var pagedetector = new PageDetector();
var pages = Page.loadFolder(path.join(process.env.DATA_DIR, 'pages'));
var printer = new Printer(process.env.PRINTER);
var controller;
switch(process.env.CONTROLLER){
	case 'instagram':
		controller = new Instagram();
		break;
	case 'salone':
		controller = new Salone();
		break;
	default:
		controller = new Controller();
		break;
}

/**
 * Listen to status changes and display information to the user
 */
pagedetector.on('change', (e) => {
	if(e === PageDetector.STATUS.NO_PAGE) {
		lcd.print(LCD.MESSAGE.INSERT_PAGE)
	} else if (e === PageDetector.STATUS.NEW_PAGE) {
		// beep
		lcd.print(LCD.MESSAGE.PAGE_DETECTED);
	}
	console.log('[EVENT] ' + e.msg);
});

/**
 * Process the detected page
 */
pagedetector.on('ready', function(n) {
	let page = Page.find(pages, n);
	if(typeof page !== "undefined") {
		lcd.print('Page ' + n);
		console.log('The new page is: ' + n);
		// stop the pagedetector
		pagedetector.stop();
		// make a request to the server for data
		getData(n)
		.then((data) => { // draw the data
			controller.load(page, data);
			return controller.draw(data);
		})
		.then(() => { // print page & wait for print to finish
			if(!process.env.DEBUGGING) {
				return printer.printAndFinish(controller.getBuffer());
			} else {
				return printer.save(controller.getBuffer(), '../../mdw-2018-data/responses/output.pdf');
			}
		})
		.then((data) => { // resume the pageDetector
			lcd.print(LCD.MESSAGE.DONE);
			pagedetector.start();
		})
		.catch((err) => { // catch the error & resume after timeout
			console.error('[ERROR] ' + err);
			lcd.print(LCD.MESSAGE.ERROR_RETRY);
			setTimeout(pagedetector.start, 5000);
		})
	} else {
		lcd.print(LCD.MESSAGE.UNKNOWN_PAGE);
	}
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
			default:
				return reject('Unknown controller')
				break;
		}

		data.key = process.env.API_KEY;

		/*request.post({
			url: url,
			form: data
		}, (err, response, body) => {
			if(err) return reject(err);
			if(response.statusCode != 200) return reject('Server responded with statuscode: ' + response.statusCode);

			resolve(body);
		});*/

		// DEBUGGING
		resolve(JSON.parse(fs.readFileSync('../../mdw-2018-data/responses/instagram/' + pagenumber + '.json')));

	});
}

/*
 * Start!
 */
if(!process.env.DEBUGGING) {
	pagedetector.start();
} else {
	pagedetector.emit('ready', 155);
}
