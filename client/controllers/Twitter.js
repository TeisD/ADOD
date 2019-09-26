const _ = require('lodash');
const Controller = require('./Controller');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const dotenv = require('dotenv');

dotenv.config();

const DATA_DIR = path.join(process.env.DATA_DIR, 'twitter');


class Twitter extends Controller {

	constructor() {
		super();
	}

	draw(data) {

		this.timestamp("Last updated from Twitter on", 20)

		// create an array of sentences with their start and stop position
		let sentence = new Sentence(),
				sentences = [];

		this.page.content.lines.forEach((line, index) => {
			line.words.forEach((word) => {
				word.line = index;
				sentence.add(word);
				if(/[.?!]/.test(word.text.slice(-1))) {
					sentences.push(sentence);
					sentence = new Sentence();
				}
			})
		})

		// score and sort the sentences
		sentences = sentences.map((sentence) => {
			sentence.score = this.score(sentence, data);
			return sentence;
		}).sort((a, b) => {
			return b.score - a.score;
		})

		// take 1 - 3 highest/lowest
		let highcount = 2 + Math.floor(Math.random() * 2),
				lowcount = 2 + Math.floor(Math.random() * 2),
				high = sentences.splice(0, highcount),
				low = sentences.splice(sentences.length - 1 - highcount, highcount);

		// mark a few leftover important pieces
		let midhigh = sentences.splice(0, Math.floor(Math.random() * 2));

		// add 0 - 2 exclamation marks and ??? in the side
		this.ctx.fillStyle = "#000000";
		let sorted = data.sort((a, b) => {return b.count - a.count});
		let highmark = sorted.slice(0, Math.floor(Math.random() * 2));
		let lowmark = sorted.slice(sorted.length - Math.floor(Math.random() * 2));
		let randomlines = _.shuffle(this.page.content.lines);

		// add some text too, to make it look cooler
		// for each line, except the highest and the lowest, add the tweet matches
		let twitterwords = [],
				matchmap = data.filter((k) => {return k.hasOwnProperty('text')}),
				matchreg = new RegExp(matchmap.map((k) => {return k.word}).join('\|'), 'i');
		this.page.content.lines.map((line) => {
			// ignore the highest and lowest scored boxes
			/*let intersect = ! high.concat(low).every((ignored) => {
				return (
					line.bbox.x0 > ignored.bbox.x1 ||
					line.bbox.x1 < ignored.bbox.x0 ||
					line.bbox.y0 > ignored.bbox.y1 ||
					line.bbox.y1 < ignored.bbox.y0
				)
			})
			if (intersect) return;*/
			// do a quick match on the line
			if (!matchreg.test(line.text)) return;
			// push the word matches
			line.words.forEach((word) => {
				let match = matchmap.filter((match) => {
					return (new RegExp('\\b' + match.word + '\\b', 'i')).test(word.text)
				});
				if (typeof match === 'undefined' || match.length === 0) return;
				twitterwords.push({
					text: word.text,
					bbox: word.bbox,
					linebox: line.bbox,
					tweet: match[0].text, 
					user: match[0].user,
					avatar: match[0].avatar,
					timestamp: match[0].timestamp
				})
			})
		})
		// remove duplicates
		twitterwords = _.uniqBy(twitterwords, 'tweet');
		// shuffle the matches
		twitterwords = _.orderBy(twitterwords, ['timestamp'], ['desc']);		// take 3 - 6 items
		
		// find some whitespace to put them
		//this.page.layoutGrid();

		let layout = this.page.layout.fixed.text;
		
		// and finally add some of them to the page
		let addedCount = 1,
			addedLimit = 3 + Math.floor(Math.random() * 3),
			currentLayout = 0,
			currentPos = 0;

		const RADIUS = 15;

		let queue = [];

		for (let w of twitterwords) {
			// note reference
			this.drawText(`${addedCount}.`, w.linebox.x0 - 8, w.linebox.y0 + 8, 6, 6, 'Agipo', 8);

			this.ctx.save();
			this.ctx.translate(layout[currentLayout].x, layout[currentLayout].y + currentPos);
			this.ctx.fillStyle = "#000000";

			// note number
			this.drawText(`${addedCount}.`, 0, 15, 7, 10, 'Agipo', 8);
			
			// profile picture
			queue.push(
				this.drawImageFromUrl(
					w.avatar,
					layout[currentLayout].x + RADIUS,
					layout[currentLayout].y + currentPos,
					RADIUS,
					RADIUS,
					path.join(DATA_DIR),
					'',
					false,
					true
				)
			);

			let x = RADIUS*2 + 20;

			// metadata
			let d = new Date(w.timestamp);
			let metaHeight = this.drawText(`@${w.user} — ${moment(d).format('DD/MM/YYYY HH:mm')}`, x, 5, 7, layout[currentLayout].width - x, 'Agipo', 8);

			// tweet
			let tweetHeight = this.drawText(w.tweet, x, metaHeight + 7, 7, layout[currentLayout].width - x, 'Genath', 8);

			currentPos += Math.max(metaHeight + tweetHeight, RADIUS*2) + 10;

			this.ctx.restore();

			// if the current layout is full, move to the next
			if(currentPos > layout[currentLayout].height - 10) {
				currentLayout++;
				currentPos = 0;
			}

			// if we reached the last layout, return
			if(currentLayout > layout.length - 1) break;

			addedCount++;
		};

		// draw the other things on top of the text
		/*highmark.forEach((keyword) => {
			let regexp = new RegExp('\\b' + keyword.word + '\\b', 'i');
			let line = randomlines.find((line) => {
				return regexp.test(line.text);
			});
			if(typeof line === 'undefined') return;
			if(line.bbox.x0 > this.page.width / 2) {
				this.drawText('!!!', line.bbox.x1, line.bbox.y1, 15, 100, 'Pecita');
			} else {
				this.drawText('!!!', line.bbox.x0 - 25, line.bbox.y1, 15, 100, 'Pecita');
			}
		});
		lowmark.forEach((keyword) => {
			let regexp = new RegExp('\\b' + keyword.word + '\\b', 'i');
			let line = randomlines.find((line) => {
				return regexp.test(line.text);
			});
			if(typeof line === 'undefined') return;
			if(line.bbox.x0 > this.page.width / 2) {
				this.drawText('???', line.bbox.x1, line.bbox.y1, 15, 100, 'Pecita');
			} else {
				this.drawText('???', line.bbox.x0 - 25, line.bbox.y1, 15, 100, 'Pecita');
			}
		});*/

		midhigh.forEach((s) => {
			for(let i = s.start.line; i <= s.end.line; i++) {
				let l = this.page.content.lines[i],
						x0 = l.bbox.x0,
						x1 = l.bbox.x1;
				if(i == s.start.line) x0 = s.start.bbox.x0;
				if(i == s.end.line) x1 = s.end.bbox.x1;
				this.ctx.fillStyle = "rgba(0,0,0,0.3)";
				this.ctx.fillRect(x0, l.bbox.y0, x1 - x0, l.bbox.y1 - l.bbox.y0);
			}
		});

		// circle the highest
		high.forEach((s) => {
			this.drawHandCircle(
				(s.bbox.x0 + s.bbox.x1) / 2,
				(s.bbox.y0 + s.bbox.y1) / 2,
				(s.bbox.x1 - s.bbox.x0) / 2 + 10,
				(s.bbox.y1 - s.bbox.y0) / 2 + 10,
				1 + Math.ceil(Math.random() * 2)
			);
		});

		// scribble the lowest
		low.forEach((s) => {
			for(let i = s.start.line; i <= s.end.line; i++) {
				let l = this.page.content.lines[i],
						x0 = l.bbox.x0,
						x1 = l.bbox.x1;
				if(i == s.start.line) x0 = s.start.bbox.x0;
				if(i == s.end.line) x1 = s.end.bbox.x1;
				this.drawScribble(
					x0,
					(l.bbox.y0 + l.bbox.y1) / 2,
					x1,
					(l.bbox.y1 + l.bbox.y1) / 2,
					l.bbox.y1 - l.bbox.y0
				);
			}
		});

		return Promise.all(queue).then(() => {
			console.log('patat');
		});

	}

	/**
	 * Score a sentence
	 * @return int The score
	 */
	score(sentence, scores) {
		let score = 0,
				matches = 0;
		sentence.sentence.forEach((word) => {
			let s = scores.find((e) => {
				return e.word == word;
			})
			if(typeof s !== 'undefined') {
				score += s.count;
				matches++;
			}
		})
		return (matches > 0) ? Math.round(score / matches) : 0;
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
