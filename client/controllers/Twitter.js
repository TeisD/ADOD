const _ = require('lodash');
const Controller = require('./Controller');

class Twitter extends Controller {

	constructor() {
		super();
	}

	draw(data) {

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
		let highcount = 1 + Math.floor(Math.random() * 2),
				lowcount = 1 + Math.floor(Math.random() * 2),
				high = sentences.splice(0, highcount),
				low = sentences.slice(sentences.length - 1 - highcount, highcount);

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

		// find a few important and unimportant pieces (excluding the high and low sentences)
		let midhigh = sentences.splice(0, 1 + Math.floor(Math.random() * 2));
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
		})

		// add 0 - 2 exclamation marks and ??? in the side
		this.ctx.fillStyle = "#000000";
		let sorted = data.sort((a, b) => {return b.count - a.count});
		let highmark = sorted.slice(0, Math.floor(Math.random() * 2));
		let lowmark = sorted.slice(-Math.floor(Math.random() * 2));
		let randomlines = _.shuffle(this.page.content.lines);
		highmark.forEach((keyword) => {
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
		})

		// add some text too, to make it look cooler
		// for each line, except the highest and the lowest, add the tweet matches
		let twitterwords = [],
				matchmap = data.filter((k) => {return k.hasOwnProperty('text')}),
				matchreg = new RegExp(matchmap.map((k) => {return k.word}).join('\|'), 'i');
		this.page.content.lines.map((line) => {
			// ignore the highest and lowest scored boxes
			let intersect = ! high.concat(low).every((ignored) => {
				return (
					line.bbox.x0 > ignored.bbox.x1 ||
					line.bbox.x1 < ignored.bbox.x0 ||
					line.bbox.y0 > ignored.bbox.y1 ||
					line.bbox.y1 < ignored.bbox.y0
				)
			})
			if (intersect) return;
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
					tweet: match[0].text
				})
			})
		})
		// remove duplicates
		twitterwords = _.uniqBy(twitterwords, 'tweet');
		// shuffle the matches
		twitterwords = _.shuffle(twitterwords);		// take 3 - 6 items
		// find some whitespace to put them
		this.page.layoutGrid();
		// and finally add some of them to the page
		let addedCount = 0,
				addedLimit = 3 + Math.round(Math.random() * 3);

		twitterwords.forEach((w) => {
			if(addedCount > addedLimit) return;

			let direction = (w.bbox.x0 < this.page.width / 2) ? 1 : -1,
					boundary = (direction > 0) ? this.page.width/2 - 150 : this.page.width/2 + 150,
					x = (direction > 0) ? w.linebox.x1 : w.linebox.x0,
					y = w.linebox.y0;
			// find a good spot for the text (move 50px at a time, don't cross the boundary)
			// maybe the current position is free?
			let currentbox = this.page.getLayoutBox(x, y),
					startbox = currentbox;
			// if it's not let's move!
			if (typeof currentbox === 'undefined') return;
			if(!currentbox.free) {
				// move to the side, don't cross the boundary, and keep a minimum width of 150 px
				while((direction > 0) ? (currentbox.x < boundary) : (currentbox.x > boundary)) {
					currentbox = (direction > 0)
						? this.page.getLayoutBoxRight(currentbox)
						: this.page.getLayoutBoxLeft(currentbox);
					if (typeof currentbox === 'undefined') return;
					if (currentbox.free) break;
				}
			}
			let sw = (Math.random() > 0.5);
			function getLayoutBoxAbove(b) {
				if(sw) return this.page.getLayoutBoxAbove(b);
				return this.page.getLayoutBoxBelow(b);
			}
			function getLayoutBoxBelow(b) {
				if(sw) return this.page.getLayoutBoxBelow(b);
				return this.page.getLayoutBoxAbove(b);
			}
			// are we good? if not, return to start and go 2 up
			if(!currentbox.free) {
				let currentlinebox = startbox;
				for(let i = 0; i < 2; i++) {
					currentlinebox = getLayoutBoxAbove.call(this, currentlinebox);
					if (typeof currentlinebox === 'undefined') return;
					currentbox = currentlinebox;
					while((direction > 0) ? (currentbox.x < boundary) : (currentbox.x > boundary)) {
						currentbox = (direction > 0)
							? this.page.getLayoutBoxRight(currentbox)
							: this.page.getLayoutBoxLeft(currentbox);
						if (typeof currentbox === 'undefined') return;
						if (currentbox.free) break;
					}
					if (typeof currentbox === 'undefined') return;
					if (currentbox.free) break;
				}
			}
			// are we good? if not return to start and go 2 down
			if(!currentbox.free) {
				let currentlinebox = startbox;
				for(let i = 0; i < 2; i++) {
					currentlinebox = getLayoutBoxBelow.call(this, currentlinebox);
					if (typeof currentlinebox === 'undefined') return;
					currentbox = currentlinebox;
					while((direction > 0) ? (currentbox.x < boundary) : (currentbox.x > boundary)) {
						currentbox = (direction > 0)
							? this.page.getLayoutBoxRight(currentbox)
							: this.page.getLayoutBoxLeft(currentbox);
						if (typeof currentbox === 'undefined') return;
						if (currentbox.free) break;
					}
					if (typeof currentbox === 'undefined') return;
					if (currentbox.free) break;
				}
			}
			// this is never gonna work, skip the word
			if (typeof currentbox === 'undefined') return;
			if(!currentbox.free) return;
			// hoodary we have a place to put the text
			// mark the boxes we're using as full (5)
			let boxtomark = currentbox;
			for(let i = 0; i < 5; i++) {
				this.page.setBoxState(boxtomark, false);
				if(direction > 0) boxtomark = this.page.getLayoutBoxRight(boxtomark);
				else boxtomark = this.page.getLayoutBoxLeft(boxtomark);
			}

			this.ctx.save();
			this.ctx.translate((direction > 0) ? currentbox.x + 20 : currentbox.x - 150, currentbox.y);
			let r = Math.floor(Math.random()*2) + 1;
			r *= Math.floor(Math.random()*2) == 1 ? 1 : -1;
			this.ctx.rotate(r * Math.PI / 180);
			this.ctx.fillStyle = "#000000";
			this.drawText(w.tweet, 0, 0, 6, 150, 'Arial', 8, 10);
			this.ctx.restore();
			if(direction > 0) {
				this.drawArrow(
					w.linebox.x1,
					(w.linebox.y0 + w.linebox.y1) / 2,
					currentbox.x + 15,
					currentbox.y
				);
			} else {
				this.drawArrow(
					w.linebox.x0,
					(w.linebox.y0 + w.linebox.y1) / 2,
					currentbox.x + 5,
					currentbox.y
				);
			}
			addedCount++;
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
