const Controller = require('./Controller');
const { Image } = require('canvas');
const path = require('path');

const DATA_DIR = '../../../mdw-2018-data/instagram/';

class Instagram extends Controller {

	constructor() {
		super();
	}

	draw(data) {

		console.log(data);

		/*this.ctx.font = "25px Arial";
		this.ctx.fillText("TOP LEFT", 25, 50);
		this.ctx.textAlign="center";
		this.ctx.fillText("Hello World", 595 / 2, 842/2);
		this.ctx.textAlign="right";
		this.ctx.fillText("BOTTOM RIGHT", 595 - 25 , 842 - 25);
		*/
		var src = path.join(__dirname, DATA_DIR, data[0].images[0]);
		this.drawImage(src, 100, 100, 300, 300);

		this.ctx.strokeRect(25, 25, 842-50, 595-50);

		return Promise.resolve();
	}

}

module.exports = Instagram;
