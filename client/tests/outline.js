const dotenv = require('dotenv');
const path = require('path');
const Canvas = require('canvas');
const Controller = require('../controllers/Controller');
const TestController = require('../controllers/Test');
const Page = require('../../shared/modules/Page');

const controller = new TestController();

dotenv.config();

var pages = Page.loadFolder(path.join(process.env.DATA_DIR, 'pages'));

pages.forEach(page => {
    controller.load(page);
    controller.draw();
    controller.saveImage();
});