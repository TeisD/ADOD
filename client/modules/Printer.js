const ipp = require('ipp');
const fs = require('fs');

class Printer {

	constructor(url) {
		this.printer = ipp.Printer(url);
	}

	/*
	 * Print the data
	 */
	print(data) {
		var msg = {
			"operation-attributes-tag": {
				"requesting-user-name": "ADOD",
				"job-name": "ADOD Job",
				"document-format": "application/pdf"
			},
			/*
			"job-attributes-tag": {
				"print-scaling": "fit"
			},
			*/
			"data": data
		};
		this.printer.execute("Print-Job", msg, function(err, res){
			console.error(err);
			console.log(res);
		});
	}

	/*
	 * Print and wait for the page to finish
	 * @param data The data to be printed
	 * @return Promise
	 * - Resolves when the print is finished
	 * - Resolves when the print has sucesfully started but the print status cannot be determined
	 * - Rejects when an error occurs before printing
	 */
	printAndFinish(data) {
		console.log('<Printer> Starting print');
		var msg = {
			"operation-attributes-tag": {
				"requesting-user-name": "ADOD",
				"job-name": "ADOD Job",
				"document-format": "application/pdf"
			},
			"data": data
		}

		return new Promise((resolve, reject) => {
			this.printer.execute("Print-Job", msg, function(err, res){
				if(err) return reject(err)
				resolve(res);
			});
		})
	}

	/*
	 * Save the data to a file
	 * Useful while debugging
	 */
	save(data, filename) {
		return new Promise((resolve, reject) => {
			fs.writeFile(filename, data,  "binary", function(err) {
				if(err) return reject(err);
				resolve();
			});
		});
	}

}

module.exports = Printer;
