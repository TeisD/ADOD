const dotenv = require('dotenv');
const path = require('path');
const Canvas = require('canvas');
const Printer = require('../modules/Printer');
const Page = require('../../shared/modules/Page');

dotenv.config();

var pages = Page.loadFolder(path.join(__dirname, '../../../mdw-2018-data', 'pages'));

var PAGES = [241, 243, 245] //247, 249, 251, 253, 255, 257];
//var PAGES = [151, 153, 155, 157, 159, 161, 163, 165];
const printer = new Printer(process.env.PRINTER);


PAGES.forEach((page) => {

	page = Page.find(pages, page);

	var canvas = new Canvas(842, 595, 'pdf');
	var ctx = canvas.getContext('2d');

	page.blocks.forEach((b) => {
		ctx.strokeRect(b.bbox.x0, b.bbox.y0, b.bbox.x1 - b.bbox.x0, b.bbox.y1 - b.bbox.y0);
	})

	printer.printAndFinish(canvas.toBuffer()).then((data) => {
		console.log(data);
	}).catch((err) => {
		console.log(err);
	});
})
