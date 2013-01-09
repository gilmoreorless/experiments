/**
 * Ring Modulator code taken from http://webaudio.prototyping.bbc.co.uk/ring-modulator/
 *
 * Modified to expose a re-usable interface instead of tying to their UI.
 * This is purely used as a learning exercise, don't copy their code from me ;)
 */

var RingModulator = (function () {

  var DiodeNode, compressor, context, distortionKnob, getLive, gotStream, isLiveInputSupported, konami, liveInput, liveInputGain, outGain, player, speedKnob,
    _this = this;
  DiodeNode = (function() {

    function DiodeNode(context) {
      this.context = context;
      this.node = this.context.createWaveShaper();
      this.vb = 0.2;
      this.vl = 0.4;
      this.h = 1;
      this.setCurve();
    }

    DiodeNode.prototype.setDistortion = function(distortion) {
      this.h = distortion;
      return this.setCurve();
    };

    DiodeNode.prototype.setCurve = function() {
      var i, samples, v, value, wsCurve, _i, _ref;
      samples = 1024;
      wsCurve = new Float32Array(samples);
      for (i = _i = 0, _ref = wsCurve.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        v = (i - samples / 2) / (samples / 2);
        v = Math.abs(v);
        if (v <= this.vb) {
          value = 0;
        } else if ((this.vb < v) && (v <= this.vl)) {
          value = this.h * ((Math.pow(v - this.vb, 2)) / (2 * this.vl - 2 * this.vb));
        } else {
          value = this.h * v - this.h * this.vl + (this.h * ((Math.pow(this.vl - this.vb, 2)) / (2 * this.vl - 2 * this.vb)));
        }
        wsCurve[i] = value;
      }
      return this.node.curve = wsCurve;
    };

    DiodeNode.prototype.connect = function(destination) {
      return this.node.connect(destination);
    };

    return DiodeNode;

  })();

  function RingModulator(context) {
    var vIn, vInDiode1, vInDiode2, vInGain, vInInverter1, vInInverter2, vInInverter3, vcDiode3, vcDiode4, vcInverter1;
    if (!context) {
      context = new webkitAudioContext();
    }

    // Setup audio components
    vIn = this.vIn = context.createOscillator();
    vIn.frequency.value = 30;
    vIn.noteOn(0);

    vInGain = context.createGainNode();
    vInGain.gain.value = 0.5;

    vInInverter1 = context.createGainNode();
    vInInverter1.gain.value = -1;
    vInInverter2 = context.createGainNode();
    vInInverter2.gain.value = -1;

    vInDiode1 = new DiodeNode(context);
    vInDiode2 = new DiodeNode(context);

    vInInverter3 = context.createGainNode();
    vInInverter3.gain.value = -1;

    vcInverter1 = this.vcInverter1 = context.createGainNode();
    vcInverter1.gain.value = -1;

    vcDiode3 = new DiodeNode(context);
    vcDiode4 = this.vcDiode4 = new DiodeNode(context);
    this.diodes = [vInDiode1, vInDiode2, vcDiode3, vcDiode4];

    outGain = context.createGainNode();
    outGain.gain.value = 4;

    compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -12;

    // Connect the audio graph
    vcInverter1.connect(vcDiode3.node);
    vIn.connect(vInGain);

    vInGain.connect(vInInverter1);
    vInGain.connect(vcInverter1);
    vInGain.connect(vcDiode4.node);

    vInInverter1.connect(vInInverter2);
    vInInverter1.connect(vInDiode2.node);
    vInInverter2.connect(vInDiode1.node);

    vInDiode1.connect(vInInverter3);
    vInDiode2.connect(vInInverter3);

    vInInverter3.connect(compressor);
    vcDiode3.connect(compressor);
    vcDiode4.connect(compressor);

    compressor.connect(outGain);
    outGain.connect(context.destination);

    // Default values
    this.setFrequency(30);
    this.setDistortion(1);
  }

  RingModulator.prototype.setInput = function (audioNode) {
    if (this.input) {
      this.input.disconnect();
    }
    this.input = audioNode;
    audioNode.connect(this.vcInverter1);
    audioNode.connect(this.vcDiode4.node);
  };

  // v range 0...2000, default=30
  RingModulator.prototype.setFrequency = function (v) {
    this.vIn.frequency.value = v;
  };

  // v range 0.2...50, default=1
  RingModulator.prototype.setDistortion = function (v) {
    this.diodes.forEach(function (diode) {
      diode.setDistortion(v);
    });
  };

  /*
  speedKnob = new Knob({
    el: "#tape-speed",
    initial_value: 30,
    valueMin: 0,
    valueMax: 2000
  });
  distortionKnob = new Knob({
    el: "#mod-distortion",
    initial_value: 1,
    valueMin: 0.2,
    valueMax: 50
  });
  distortionKnob.on('valueChanged', function(v) {
    return _.each([vInDiode1, vInDiode2, vcDiode3, vcDiode4], function(diode) {
      return diode.setDistortion(v);
    });
  });
  speedKnob.on('valueChanged', function(v) {
    return vIn.frequency.value = v;
  });
  */
  /*
  liveInputGain = context.createGainNode();
  liveInput = null;
  isLiveInputSupported = function() {
    var browser, isSupported, majorVersion;
    isSupported = false;
    browser = $.browser;
    if (browser.chrome) {
      majorVersion = parseInt(browser.version.split('.')[0]);
      if (majorVersion >= 23) {
        isSupported = true;
      }
    }
    return isSupported;
  };
  getLive = function() {
    return navigator.webkitGetUserMedia({
      audio: true
    }, gotStream);
  };
  gotStream = function(stream) {
    liveInput = context.createMediaStreamSource(stream);
    liveInput.connect(liveInputGain);
    liveInputGain.connect(vcInverter1);
    return liveInputGain.gain.value = 1.0;
  };
  */

  return RingModulator;
})();