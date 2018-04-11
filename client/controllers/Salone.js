const _ = require('lodash');
const Controller = require('./Controller');

class Salone extends Controller {

	constructor() {
		super();
	}

	draw(data) {

		if(typeof _.get(this.page, 'layout.fixed.text') === 'undefined') Promise.resolve();

		let box = this.page.layout.fixed.text[0];

		data = data.replace(/%project%/g, this.page.title);
		data = data.replace(/%producer%/g, this.page.author);
		data = data.replace(/%designer%/g, this.page.author);
		data = data.replace(/UNK/g, '');

		this.drawText(data, box.x, box.y + 6, 6, box.width, 'Times', 10);
	}
}

module.exports = Salone;
