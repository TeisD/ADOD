const fs = require('fs');
const path = require('path');

class Page {

	constructor(width, height, title, author, number, content, keywords) {
		this.width = width;
		this.height = height;
		this.title = title;
		this.author = author;
		this.number = number;
		this.content = content;
		this.keywords = keywords;
	}

	/*
	 * Find whitespace on a page
	 * To have some variation, this function randomly starts from one of the corners of the page
	 * @return false if no whitespace has been found
	 * @return {x, y, with, height} a whitespace area
	 */
	findWhitespace() {

	}

	/*
	 * Mark a whitespace area as filled
	 */
	unWhitespace() {

	}

	/*
	 * Construct a new Page from a json file
	 * @param file The file to load
	 * @return The Page instance
	 */
	static load(file) {
		if (!fs.existsSync(file)) throw 'The file does not exist';

		var page = JSON.parse(fs.readFileSync(file));
		var width = page.width;
		var height = page.height;
		var title = page.title;
		var author = page.author;
		var number = page.number;
		var content = page.content;
		var keywords = page.keywords;

		return new Page(width, height, title, author, number, content, keywords);
	}

	/*
	 * Load all the page json files in a certain directory and return an array of Page instances
	 * @param dir The directory to load
	 * @return An array of Page object
	 */
	static loadFolder(dir) {
		if (!fs.existsSync(dir)) throw 'The folder does not exist';

		var pages = [];

		fs.readdirSync(dir).forEach(file => {
			if(file.indexOf('.json') >= 0) {
  			pages.push(Page.load(path.join(dir, file)));
			}
		});

		return pages;
	}

	/*
	 * Find the Page with given pagenumber in an array of pages
	 * @param pages An array of pages
	 * @param pagenumber The pagenumber to find
	 */
	static find(pages, pagenumber) {
		for(let page of pages) {
			if(page.number == pagenumber) return page
		}
	}

}

module.exports = Page;
