const LCD = require('./modules/LCD');
const PageDetector = require('./modules/PageDetector');

var lcd = new LCD();
var pagedetector = new PageDetector();

pagedetector.start();

pagedetector.on('change', (e) => {
	console.log('[EVENT] ' + e);
});

pagedetector.on('new', function() {
	console.log('New page detected');
});

pagedetector.on('ready', function(n) {
	console.log('The new page is: ' + n);
});

pagedetector.on('error', (err) => {
	console.error('[ERROR] ' + err);
});
