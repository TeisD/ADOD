const Piezo = require('../modules/Piezo');
const rpio = require('rpio');

var piezo = new Piezo(12);

b();

function b(){
	console.log('beep');
	piezo.beep(Piezo.BEEPS.OK);
	setTimeout(b, 1000);
}
