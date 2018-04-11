const dotenv = require('dotenv');
const Canvas = require('canvas');
const Printer = require('../modules/Printer');

dotenv.config();

const printer = new Printer(process.env.PRINTER);

var canvas = new Canvas(100, 100, 'pdf');

printer.printAndFinish(canvas.toBuffer()).then((data) => {
	console.log(data);
}).catch((err) => {
	console.log(err);
});
