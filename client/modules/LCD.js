// ugly require to not break on systems without i2c bus
var LCDi2C = class {
	println(s, n) {
		console.log('[LCD] ' + s);
	}
	clear(){
	}
}

try {
	LCDi2C = require('lcdi2c');
} catch(e) {
	console.error('lcdi2c could not be initialized')
}

const MESSAGE = {
	INSERT_PAGE: "Insert page",
	UNKNOWN_PAGE: "Unknown page",
	PAGE_DETECTED: "Detected page!\nRecognizing...",
	ERROR_RETRY: "Error :(\nRetrying in 5s...",
	DONE: "Done!",
	TIMEOUT_RETRY: "Server too slow\nRetrying... ($)",
	TIMEOUT_PROCEED: "Server too slow\nPrinting empty",
	SERVER_RETRY: "Server error\nRetrying... ($)",
	SERVER_PROCEED: "Server error\nPrinting empty",
	NO_DATA: "No links found",
	SEARCHING: "Searching for\nlinks",
	DRAWING: "Preparing to\nprint",
	PRINTING: "Printing page\nPlease wait..."
}

class LCD {
	constructor(){
		this.lcd = new LCDi2C(1, 0x27, 16, 2);
		this.text = null;
		this.clear();
	}

	printVar(msg, v) {
		this.print(msg.replace('$', v));
	}

	print(text) {
		if(text == this.text) return;
		if(!text) this.clear();

		let lines = [];

		text.split(' ').forEach(word => {
			word = word.split('\n');
			let i = (typeof lines.length === 'undefined' || lines.length == 0) ? 0 : lines.length - 1;
			let v = (typeof lines[i] === 'undefined') ? word[0] : lines[i] + ' ' + word[0];
			if(v.length > 16) {
				lines.push(word[0]);
			} else {
				lines[i] = v;
			}
			if(word.length > 1) {
				for (let i = 1; i < word.length; i++) lines.push(word[i]);
			}
		});

		this.clear();

		lines.forEach((line, i) => {
			if(i <= 2) this.lcd.println(line, i+1);
		});

		this.text = text;
	}

	println(text, line) {		
		if(text == this.text) return;
		this.lcd.println(text, line);
		this.text = text;
	}

	clear() {
		this.lcd.clear();
		this.text = null;
	}

	static get MESSAGE() {
		return MESSAGE;
	}
}

module.exports = LCD;
