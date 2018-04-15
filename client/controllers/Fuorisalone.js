const _ = require('lodash');
const Controller = require('./Controller');

const TIMELINE_Y = 50;

class Fuorisalone extends Controller {

	constructor() {
		super();
	}

	draw(data) {

		this.drawTimeline(this.page.keywords.time);

		if(data.length > 0 && data[0] != null && data[0].hasOwnProperty('title')) {
			this.drawEvent(data[0]);
		} else {
			this.ctx.font = 'bold 10pt Arial';
			this.ctx.textAlign = 'center';
			this.ctx.fillStyle = '#000000';
			this.ctx.strokeStyle = '#000000';
			this.ctx.save();
			this.ctx.translate(this.page.width / 2, 535);
			this.ctx.fillText('No related events today', 0, 0);
			this.ctx.font = '7pt Arial';
			this.ctx.fillText('Try again tomorrow!', 0, 20);
			this.ctx.strokeRect(-100, -15, 200, 50);
			this.ctx.restore();
		}

	}

	drawTimeline(markers) {
		let timelineStart = 70;
		let timelineEnd = this.page.width - 90;
		this.ctx.font = 'bold 7pt Arial';
		this.ctx.textBaseline = 'middle';
		this.ctx.fillStyle = "#000000";
		this.ctx.fillText('PAST', 30, TIMELINE_Y);
		this.ctx.textAlign = 'right';
		this.ctx.fillText('FUTURE', this.page.width - 30, TIMELINE_Y);
		this.ctx.textAlign = 'left';
		this.ctx.strokeWidth = 5;
		this.ctx.beginPath();
		this.ctx.moveTo(timelineStart, TIMELINE_Y);
		this.ctx.lineTo(timelineEnd, TIMELINE_Y);
		this.ctx.stroke();

		if(typeof markers === 'undefined' || markers.length == 0) return;

		// sort the markers by year
		markers.push({
			year: 2018,
			description: 'now',
			bold: true
		});
		markers = markers.sort((a, b) => { return a.year - b.year });
		let start = markers[0].year;
		let end = markers[markers.length - 1].year;
		let previousx = 0;
		markers.forEach((marker) => {
			let x = Math.max(previousx + 10, map(marker.year, start, end, timelineStart + 20, timelineEnd - 20));
			this.ctx.beginPath();
			this.ctx.save();
			this.ctx.translate(x, TIMELINE_Y)
			this.ctx.arc(0, 0, 4, 0, 2 * Math.PI, false);
      this.ctx.fill();
			this.ctx.rotate(-Math.PI / 4);
			this.ctx.font = 'bold 7pt Arial';
			this.ctx.textBaseline = 'middle';
			this.ctx.fillStyle = "#000000";
			this.ctx.fillText(marker.year, 9, -5);
			this.ctx.rotate(Math.PI / 2);
			this.ctx.font = '7pt Arial';
			if(marker.hasOwnProperty('bold') && marker.bold) this.ctx.font = 'bold 7pt Arial';
			this.ctx.fillText(marker.description, 9, 5);
			this.ctx.restore();
			previousx = x;
		})

		function map(value, start1, stop1, start2, stop2) {
			return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
		}
	}

	drawEvent(event) {
		let width = 0;
		this.ctx.font = 'bold 10pt Arial';
		this.ctx.textAlign = 'center';
		this.ctx.fillStyle = '#000000';
		this.ctx.strokeStyle = '#000000';
		this.ctx.save();
		this.ctx.translate(this.page.width / 2, 500);
		this.ctx.fillText(event.title, 0, 0);
		width = Math.max(width, this.ctx.measureText(event.title).width);
		this.ctx.font = 'italic 7pt Arial';
		this.ctx.fillText(event.organiser + ' - ' + event.address, 0, 17);
		width = Math.max(width, this.ctx.measureText(event.organiser + ' - ' + event.address).width);
		this.ctx.font = '7pt Arial';
		let descriptionWidth = this.ctx.measureText(event.description).width;
		if(descriptionWidth > this.page.width - 200) {
			let t = event.description.split(' ');
			let line1 = t.slice(0, Math.ceil(t.length/2)).join(' ');
			let line2 = t.slice(Math.ceil(t.length/2)).join(' ');
			width = Math.max(width, this.ctx.measureText(line1).width);
			width = Math.max(width, this.ctx.measureText(line2).width);
			this.ctx.fillText(line1, 0, 33);
			this.ctx.fillText(line2, 0, 43);
		} else {
			width = Math.max(width, descriptionWidth);
			this.ctx.fillText(event.description, 0, 38);
		}
		this.ctx.font = '10pt Arial';
		if(typeof event.today === 'undefined') event.today = "Closed today"
		this.ctx.fillText('Open today ' + event.today, 0, 62);
		width = Math.max(width, this.ctx.measureText('Open today ' + event.today).width);
		this.ctx.strokeRect(-width/2 - 10, -15, width + 20, 92);
		this.ctx.restore();
	}
}

module.exports = Fuorisalone;
