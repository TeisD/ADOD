const rpio = require('rpio');

const BEEPS = {
	OK: {
		frequency: 1000,
		length: 100,
		delay: 100,
		times: 2
	},
	ERROR: {
		frequency: 500,
		length: 300,
		delay: 1000,
		times: 2
	}
}

class Piezo {

	constructor(pin) {
		this.pin = pin;
		this.clockDivider = 16;
		this.clockFreq = 1.2e6;
		this.dutyCycle = 2;

		rpio.open(this.pin, rpio.PWM);
		rpio.pwmSetData(this.pin, 0);
		rpio.pwmSetClockDivider(this.clockDivider);
	}

	beep(b) {
		if(!b) {
			b = BEEPS.OK;
		}
		if (!b.hasOwnProperty('frequency')) {
			b.frequency = BEEPS.OK.frequency;
		}
		if (!b.hasOwnProperty('length')) {
			b.length = BEEPS.OK.length;
		}
		if (!b.hasOwnProperty('time')) {
			b.time = BEEPS.OK.time;
		}

		rpio.pwmSetRange(this.pin, this.clockFreq / b.frequency );

		this.on(Object.assign({}, b));
	}

	on(b) {
		if(b.times < 1) {
			this.off();
			return;
		}

		rpio.pwmSetData(this.pin, (this.clockFreq / b.frequency) / this.dutyCycle);
		b.times--;
		setTimeout(this.off.bind(this), b.length);
		setTimeout(() => {
			this.on(b);
		}, b.length + (b.hasOwnProperty('delay') ? b.delay : b.length));
	}

	off() {
		rpio.pwmSetData(this.pin, 0);
	}

	static get BEEPS() {
		return BEEPS;
	}
}

module.exports = Piezo;
