const _ = require('lodash');
const Controller = require('./Controller');

class Salone extends Controller {

	constructor() {
		super();
	}

	draw(data) {

		if(typeof data === 'undefined') return Promise.resolve();

		if(typeof _.get(this.page, 'layout.fixed.text') === 'undefined') Promise.resolve();

		let box = this.page.layout.fixed.text[0];

		let text = JSON.parse(data);
		text = text.replace(/%project%/g, this.page.title);
		text = text.replace(/%producer%/g, this.page.author);
		text = text.replace(/%designer%/g, this.page.author);
		text = text.replace(/UNK/g, '');

		this.drawText(text, box.x, box.y, 6, box.width, 'Times', 10);
	}
}

module.exports = Salone;
