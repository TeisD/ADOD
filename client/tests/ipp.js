// all execute options: https://github.com/williamkapke/ipp/blob/master/lib/enums.js#L52

const ipp = require('ipp');
const PDFDocument = require('pdfkit');
const concat = require("concat-stream");

var printer = ipp.Printer("http://raspberrypi-teis-1.local.:631/printers/LaserJet");
var doc = new PDFDocument({margin:0});

doc.text("Hello world!", 500, 500);

doc.pipe(concat(function(pdf){
	var msg = {
		"operation-attributes-tag": {
		"requesting-user-name": "Teis",
		"job-name": "Test Job",
		"document-format": "application/pdf"
		},
		data: pdf
	};
	/*printer.execute("Print-Job", msg, function(err, res){
		console.log(res);
	});*/
	printer.execute("Get-Printer-Attributes", {
		"operation-attributes-tag": {
			"requesting-user-name": "Teis",
			"job-name": "Test Job",
			"document-format": "application/pdf"
		}
	},
	function(err, res) {
		console.error(err);
		console.log(res["printer-attributes-tag"]["media-size-supported"]);
	});
}));
doc.end();
