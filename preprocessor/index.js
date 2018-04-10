const path = require('path');
const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const INPUT = path.join(__dirname, '../../mdw-2018-data/pages-pre/');
const OUTPUT = path.join(__dirname, '../../mdw-2018-data/pages/');

function main() {
	if (!fs.existsSync(INPUT)) throw 'The folder does not exist';

	var pages = [];

	fs.readdirSync(INPUT).forEach(file => {
		let filename = file.substring(0, file.indexOf('.'));
		let extension = file.substring(file.indexOf('.') + 1);

		let page = pages.find((p) => p.number == filename);

		if(typeof page === "undefined") {
			if(isNaN(parseInt(filename))) return;
			page = {
				number: parseInt(filename)
			};
			pages.push(page);
		}

		switch(extension) {
			case 'html':
				page.layout = path.join(INPUT, file);
				break;
			case 'txt':
				page.text = path.join(INPUT, file);
				break;
			case 'json':
				page.data = path.join(INPUT, file);
				break;
		}
	});

	pages.forEach((page) => {
		if(!page.layout | !page.text | !page.data) return;
		console.log("Processing page " + page.number);
		let data = process(page);
		let file = path.join(OUTPUT, data.number + '.json');
		fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
	})

	console.log("Success!");
}

function process(page) {
	var data = JSON.parse(fs.readFileSync(page.data));
	data.number = page.number;
	data.content = {};

	// add the text
	var text = fs.readFileSync(page.text);
	text = text.toString().replace(/\s+/g, ' ').trim();
	data.content.text = text;

	// parse the layout data
	var layout = fs.readFileSync(page.layout).toString();
	var { document } = new JSDOM(layout).window;

	// width and height of page
	data.width = parseInt( document.getElementsByTagName('page')[0].getAttribute('width') );
	data.height = parseInt( document.getElementsByTagName('page')[0].getAttribute('height') );

	// position of blocks
	data.blocks = [];
	var blocks = document.getElementsByTagName('block');
	Array.from(blocks).forEach((block) => {
		let text = block.textContent.replace(/\s+/g, ' ').trim();
		let x0 = block.getAttribute('xMin');
		let y0 = block.getAttribute('yMin');
		let x1 = block.getAttribute('xMax');
		let y1 = block.getAttribute('yMax');
		data.blocks.push({
			text: text,
			bbox: {
				x0: x0,
				y0: y0,
				x1: x1,
				y1: y1
			}
		});
	});

	// line data
	data.content.lines = [];
	var lblocks = document.getElementsByClassName('main');
	Array.from(lblocks).forEach((block) => {
		var lines = block.getElementsByTagName('line');
		Array.from(lines).forEach((line) => {
			let _line = {
				text: line.textContent.replace(/\s+/g, ' ').trim(),
				bbox: {
					x0: line.getAttribute('xMin'),
					y0: line.getAttribute('yMin'),
					x1: line.getAttribute('xMax'),
					y1: line.getAttribute('yMax'),
				},
				words: []
			}
			let words = line.getElementsByTagName('word');
			Array.from(words).forEach((word) => {
				let _word = {
					text: word.textContent.replace(/\s+/g, ' ').trim(),
					bbox: {
						x0: word.getAttribute('xMin'),
						y0: word.getAttribute('yMin'),
						x1: word.getAttribute('xMax'),
						y1: word.getAttribute('yMax'),
					}
				}
				_line.words.push(_word);
			});
			data.content.lines.push(_line);
		});
	})

	return data;
}

main();
