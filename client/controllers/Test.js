const Controller = require('./Controller');
const fs = require('fs');
const path = require('path');

class Test extends Controller {

	constructor() {
		super();
	}

	draw() {
        this.page.content.lines.forEach(line => {
            this.ctx.rect(line.bbox.x0, line.bbox.y0, line.bbox.w, line.bbox.h);
            let textX = line.bbox.x0;
            let textY = line.bbox.y0 + line.bbox.h;
            if(line.bbox.hasOwnProperty('group_y1')) {
                textY = line.bbox.group_y1;
                let first = this.page.content.lines.find(l => l._id == line._id);
                if(typeof first !== 'undefined') {
                    textX = first.bbox.x0;
                }
            }

            this.drawText(line._id, textX, textY + 10, 7);
            this.ctx.stroke();
        })
    }
}

module.exports = Test;
