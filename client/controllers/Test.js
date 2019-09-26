const Controller = require('./Controller');
const fs = require('fs');
const path = require('path');

class Test extends Controller {

	constructor() {
		super();
	}

	draw() {

        // draw the blocks
        this.page.blocks.forEach(block => {
            if(block.main) {
                this.ctx.strokeStyle = "#ff0000"
            } else {
                this.ctx.strokeStyle = "#000000"
            }
            this.ctx.strokeRect(block.bbox.x0, block.bbox.y0, block.bbox.x1 - block.bbox.x0, block.bbox.y1 - block.bbox.y0);
        })

    }
}

module.exports = Test;
