const LCDi2C = require('lcdi2c');

const MESSAGE = {
	INSERT_PAGE: "Place page in paper tray",
	UNKNOWN_PAGE: "Unknown page",
	PAGE_DETECTED: "Detected page!\nRecognizing...",
}

class LCD {
	constructor(){
		this.lcd = new LCDi2C(1, 0x27, 16, 2);
		this.text = null;
		this.clear();
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
