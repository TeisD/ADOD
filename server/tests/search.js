// file limits:
// https://github.com/karma-runner/karma/issues/1979#issuecomment-217994084
// http://blog.mact.me/2014/10/22/yosemite-upgrade-changes-open-file-limit

const path = require('path');
const _ =  require('lodash');

const RX = require('rx-text-search');
const findInFiles = require('find-in-files');

const DATA_DIR = path.join(__dirname, '../../../mdw-2018-data/');

//const KEYWORDS = [ 'refugee', 'immigra', 'orange', 'black.*line', 'horizontal.*line', 'colours', 'colors', 'photograph', 'symbol', 'flag' ];

const KEYWORDS = ['sketch.*industrial|umberto']

// search all keywords at once
RX.findAsPromise(KEYWORDS, '**/*.txt', {
		cwd: path.join(DATA_DIR, 'instagram')
	})
	.then((data) => {
		//console.log(data[0]);
		console.log("RX done");
		console.log(process.uptime());
		console.log(data.length + " results");
	})
	.catch((err) => {
		console.error("RX Failed");
		console.log(err);
	});
