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

        if(typeof this.page.layout == 'undefined') return;

        // draw the whitespace
        if(typeof this.page.layout.fixed.text !== 'undefined') {
            this.ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
            this.page.layout.fixed.text.forEach(block => {
                this.ctx.fillRect(block.x, block.y, block.width, block.height);
            })
        }
        if(typeof this.page.layout.fixed.images !== 'undefined'){
            this.ctx.fillStyle = "rgba(0, 0, 255, 0.3)";
            this.page.layout.fixed.images.forEach(block => {
                this.ctx.fillRect(block.x, block.y, block.width, block.height);
            })
        }

    }
}

module.exports = Test;
