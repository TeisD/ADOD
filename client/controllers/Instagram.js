const Controller = require('./Controller');
const { Image } = require('canvas');
const path = require('path');

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

		var img = new Image();
		img.dataMode = Image.MODE_MIME | Image.MODE_IMAGE; // Both are tracked
		img.src = path.join(__dirname, '../../../mdw-2018-data/instagram/#salonedelmobile/2018-03-16_13-52-25_UTC.jpg');
		this.ctx.drawImage(img, 100, 100, 500, 500)

		this.ctx.strokeRect(25, 25, 842-50, 595-50);

		return Promise.resolve();
	}

}

module.exports = Instagram;
