const LCD = require('./modules/LCD');
const Page = require('../shared/modules/Page');
const PageDetector = require('./modules/PageDetector');

var lcd = new LCD();
var pagedetector = new PageDetector();
var pages = Page.loadFolder(path.join(DATA_DIR, 'pages'));

pagedetector.start();

pagedetector.on('change', (e) => {
	if(e === PageDetector.STATUS.NO_PAGE) {
		lcd.print(LCD.MESSAGE.INSERT_PAGE)
	} else if (e === PageDetector.STATUS.NEW_PAGE) {
		lcd.print(LCD.MESSAGE.PAGE_DETECTED);
	}
	console.log('[EVENT] ' + e.msg);
});

pagedetector.on('ready', function(n) {
	lcd.print('Page ' + n)
	console.log('The new page is: ' + n);
});

pagedetector.on('error', (err) => {
	console.error('[ERROR] ' + err);
});
