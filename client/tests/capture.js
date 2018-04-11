const Raspistill = require('node-raspistill').Raspistill;
const cv = require('opencv');

const camera = new Raspistill({
	noFileSave: true,
	width: 2000,
	time: 1,
});

camera.takePhoto()
	.then((photo) => {
		cv.readImage(photo, (err, im) => {
			if(!err) im.save('out.jpg');
		})
	})
.catch((err) => {
	console.log(err);
});
