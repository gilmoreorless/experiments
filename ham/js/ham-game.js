(function (window) {
	var HAM = window.HAM = {};

	/*** EVENTS ***/

	['on', 'once', 'off'].forEach(function (name) {
		HAM[name] = function () {
			var args = Array.prototype.slice.apply(arguments);
			args[0] = 'ham.' + args[0];
			return eve[name].apply(eve, args);
		};
	});

	/**
	 * HAM.trigger('event.name', arg1, ...)
	 *  maps to
	 * eve('ham.event.name', HAM, arg1, ...)
	 */
	HAM.trigger = function () {
		var args = Array.prototype.slice.apply(arguments);
		args[0] = 'ham.' + args[0];
		args.splice(1, 0, HAM);
		return eve.apply(eve, args);
	};

	/*** GAME ***/


	/*** INPUT ***/

	HAM.input = {
		inputStream: null,
		audioSource: null,

		getUserMedia: function () {
			var that = this;
			navigator.getUserMedia({video: true, audio: true}, function (stream) {
				that.inputStream = stream;
				that.audioSource = HAM.sfx.context.createMediaStreamSource(stream);
				HAM.trigger('input.start');
			}, function () {
				console.error('Oh no! Something went wrong and I can\'t be bothered handling this error properly.');
			});
		},

		getVideo: function () {

		},

		getAudio: function (callback) {
			if (this.audioSource) {
				callback(this.audioSource);
				return;
			}
			var that = this;
			HAM.once('input.start', function () {
				callback(that.audioSource);
			});
			this.getUserMedia();
		}
	};


	/*** AUDIO ***/

	HAM.Sound = function (params) {
		this.name = params.name;
		this.context = params.context;
		this.loop = !!params.loop;
		this.src = null;
		this.buffer = null;
		this.state = 'empty';
	};

	var Sproto = HAM.Sound.prototype;

	Sproto.record = function () {
		HAM.sfx.recorder.clear();
		HAM.sfx.recorder.record();
		this.state = 'recording';
	};

	Sproto.stopRecording = function () {
		var that = this;
		HAM.sfx.recorder.stop();
		HAM.sfx.recorder.getBuffer(function (buffers) {
            if (!buffers[0].length) {
                console.log('No buffer length');
                that.src = null;
                return;
            }

            var buffer = that.context.createBuffer(2, buffers[0].length, that.context.sampleRate);
            buffer.getChannelData(0).set(buffers[0]);
            buffer.getChannelData(1).set(buffers[1]);
            that.buffer = buffer;
            that.state = 'stopped';
		});
	};

	Sproto.play = function () {
		console.log('play', this.name, this);
		if (this.buffer) {
			// Need to create a new AudioBufferSourceNode each time as they can't be played more than once
			this.src = this.context.createBufferSource();
			this.src.buffer = this.buffer;
			this.src.connect(this.context.destination);
			this.src.start(0);
			this.state = 'playing';
			setTimeout(this.stop.bind(this), this.src.buffer.duration * 1000);
		}
	};

	Sproto.stop = function () {
		console.log('stop', this.name, this);
		if (this.src && this.state == 'playing') {
			this.src.disconnect();
			this.src = null;
			this.state = 'stopped';
		}
	};

	var sounds = {};

	HAM.sfx = {
		context: new AudioContext(),
		recorder: null,

		init: function () {
			this.add('engine', {
				loop: true
			});
			this.add('fire');
			HAM.input.getAudio(function (audioSource) {
				this.recorder = new Recorder(audioSource, {
                    workerPath: '../common/js/recorderWorker.js'
                });
			}.bind(this));
		},

		add: function (name, options) {
			options || (options = {});
			options.name = name;
			options.context = this.context;
			sounds[name] = new HAM.Sound(options);
			return sounds[name];
		},

		get: function (name) {
			return sounds[name];
		},

		names: function () {
			return Object.keys(sounds);
		}
	};

	HAM.sfx.init();

})(this);