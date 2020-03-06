const _ = require('lodash');
const Controller = require('./Controller');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

class Twitter extends Controller {

	constructor() {
		super();
	}

	draw(data) {
		this.page.blocks.forEach(block => {
			block.lines.forEach(line => {
				let tweets = data.find(d => d.id == line._id);
				
				let x = line.bbox.x0 - 5;
				let y = line.bbox.y0 + 21;
				let h = block.bbox.h;
				let w = block.bbox.w;

				let currentPos = y;
				let indent = line.bbox.w;
				let i = 0;

				while(currentPos < y + h - 40 && i < tweets.tweets.length) {

					let tweet = tweets.tweets[i];

					let text = this.drawText(" ● " + tweet.text, x, currentPos, 16, w, "WorkSans", 26, false, indent, true);

					if(currentPos + text.height < y + h) {
						this.drawText(" ● " + tweet.text, x, currentPos, 16, w, "WorkSans", 26, false, indent);
						let tag = this.drawText(`defined ${moment(tweet.created_at).fromNow()} by @${tweet.user}`, x, currentPos + text.height - 26, 12, w, "WorkSans", 26, true, text.x)
						if (tag.lines > 1) {
							indent = tag.x;
						} else {
							indent = 0;
						}
					}

					currentPos += text.height;

					i++;
				}
			})
		});
	}
}

/*
 * Sentence convenience class
 */
class Sentence {
	constructor() {
		this.sentence = [];
		this.start = null;
		this.end = null;
		this.bbox = {
			x0: +Infinity,
			y0: +Infinity,
			x1: 0,
			y1: 0
		};
		this.hyphen = false;
	}

	/**
	 * Add a word
	 */
	add(word) {
		// update the start and end markers and the bbox
		if(this.sentence.length == 0) this.start = word;
		this.end = word;
		if(word.bbox.y0 < this.bbox.y0) this.bbox.y0 = word.bbox.y0;
		if(word.bbox.x0 < this.bbox.x0) this.bbox.x0 = word.bbox.x0;
		if(word.bbox.y1 > this.bbox.y1) this.bbox.y1 = word.bbox.y1;
		if(word.bbox.x1 > this.bbox.x1) this.bbox.x1 = word.bbox.x1;

		// set the hyphen marker
		let hyphen = (word.text.slice(-1) == '-');

		// clean the word
		let text = word.text.toLowerCase().replace(/[^’-\w]/, '');
		if(text.indexOf('’') > 0) text = text.substr(0, text.indexOf('’'));
		text = text.split('-');
		text = text.filter(n => n)

		if(this.hyphen && this.sentence.length > 0) {
			this.sentence.push(this.sentence.pop() + text.shift())
		}
		this.sentence = this.sentence.concat(text);

		this.hyphen = hyphen;
	}
}

module.exports = Twitter;
