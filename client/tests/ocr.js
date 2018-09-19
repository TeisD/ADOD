const fs = require('fs');
const path = require('path');
const cv = require('opencv');
const PageDetector = require('../modules/PageDetector');
const Tesseract = require('tesseract.js');

const LANGPATH = path.join(__dirname, '../../shared/assets/languages/');
const COREPATH = path.join(__dirname, '../node_modules/tesseract.js-core/index.js');

const PHOTO = path.join(__dirname, '../../../../7_Tests/turkish.jpg');

console.log(PHOTO);

const pageDetector = new PageDetector();
const tesseract = Tesseract.create({
    langPath: LANGPATH,
    corePath: COREPATH,
});

cv.readImage(PHOTO, (err, im) => {
    if (err) throw err;
    if (im.width() < 1 || im.height() < 1) throw 'Image has no size';
    let image = pageDetector.findPagenumber(im);

    /*let page =  tesseract.recognize(image, {
        lang: 'eng',
        tessedit_char_whitelist: '0123456789'
    })*/

    //console.log(page);

});