const Controller = require('./Controller');
const Instagram = require('./Instagram');
const Twitter = require('./Twitter');

class Test extends Controller {

	constructor() {
        super();
        this.instagram = new Instagram();
        this.twitter = new Twitter();
    }
    
    load(page) {
        this.instagram.load(page);
        this.twitter.load(page);
    }

	draw(data) {
        this.twitter.draw(data[1]);
        this.instagram.canvas = this.twitter.canvas;
        this.instagram.ctx = this.twitter.ctx;

        return this.instagram.draw(data[0]).then(() => {
            this.canvas = this.instagram.canvas;
            this.ctx = this.instagram.ctx;
        });
    }

}

module.exports = Test;
