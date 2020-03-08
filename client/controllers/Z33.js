const Controller = require('./Controller');
const Instagram = require('./Instagram');
const Twitter = require('./Twitter');

class Test extends Controller {

	constructor() {
        super();
        this.instagram = new Instagram();
        this.twitter = new Twitter();
    }
    
    load(page, rotate) {
        this.instagram.load(page, rotate);
        this.twitter.load(page, rotate);

        this.canvas = this.twitter.canvas;
        this.ctx = this.twitter.ctx;
    }

	draw(data) {
        this.twitter.draw(data[1]);
        this.instagram.canvas = this.canvas;
        this.instagram.ctx = this.ctx;

        return this.instagram.draw(data[0]).then(() => {
            this.canvas = this.instagram.canvas;
            this.ctx = this.instagram.ctx;
        });
    }

}

module.exports = Test;
