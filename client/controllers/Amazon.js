const Controller = require('./Controller');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const dotenv = require('dotenv');

dotenv.config();

const OUTPUT_DIR = path.join(process.env.DATA_DIR, 'amazon')

class Amazon extends Controller {

	constructor() {
		super();
	}

	async draw(data) {

        let queue = [];

        for (let block of this.page.blocks) {

            // select as much lines as the page size allows
            let lines = _.clone(block.lines);
            let selection = [];
            let length = block.layout.hasOwnProperty('amazon') ? block.layout.amazon.length : 0;
            for(let i = 0; i < length; i++) {
                // take a random item
                let line = _.sample(lines);
                // get the book title and image
                let amazon = _.sample(data.find(d => d.term == line.text).amazon);
                // add it to selection if posible, or take another one
                if(typeof amazon === 'undefined') {
                    i--;
                    continue;
                }
                line.amazon = amazon;
                // add to selection
                selection.push(line);
                // remove all lines with the same id
                lines = lines.filter(l => l._id !== line._id);
            }

            // sort by id
            selection = selection.sort((a, b) => a._id - b._id);

            for(let i = 0; i < selection.length; i++) {
                let line = selection[i];
                let textX = line.bbox.x0;
                let textY = line.bbox.y0 + line.bbox.h;
                if(line.bbox.hasOwnProperty('group_y1')) {
                    textY = line.bbox.group_y1;
                    let first = block.lines.find(l => l._id == line._id);
                    if(typeof first !== 'undefined') {
                        textX = first.bbox.x0;
                    }
                }

                // the title
                this.drawText(line.amazon.title, textX, textY + 3, 7, 200, 'SpaceMono', 7.5);
                // book icon
                this.drawText('&', line.bbox.x0 + line.bbox.w - 7, line.bbox.y0 + 7.5, 10, 200, 'Wingdings');
                // text marker
                this.drawText('(' + (i+1) + ')', line.bbox.x0 + line.bbox.w + 14, line.bbox.y0 + 2, 5, 200, 'SpaceMono');
                // book marker
                this.drawText('(' + (i+1) + ')', block.layout.amazon[i].bbox.x0 - 13, block.layout.amazon[i].bbox.y0 + 3, 5, 200, 'SpaceMono');

                let bbox = block.layout.amazon[i].bbox;
                let parts = line.amazon.image_url.split('/');
                let filename = parts.pop() || parts.pop();
                console.log(filename);
                filename = filename.replace(/_AC_US\d*_/, '_AC_SY500_');
                console.log(filename);
                let hostname = line.amazon.image_url.substr(0, line.amazon.image_url.length - filename.length);
                queue.push(this.drawImageFromUrl(filename, bbox.x0, bbox.y0, bbox.w, bbox.h, OUTPUT_DIR, hostname, true));
            }
        }

        return Promise.all(queue);
    }
}

module.exports = Amazon;
