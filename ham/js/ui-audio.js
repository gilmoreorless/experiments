(function (HAM) {

    HAM.ui || (HAM.ui = {});
    var ui = HAM.ui.audio = {};
    var $ = HAM.$;

    function AudioControl(params) {
        this.name = params.name;
        this.elem = params.elem || put('.audio-control');
        this.sound = params.sound;
        this.buttons = {};
        this.setup();
    }

    var ACproto = AudioControl.prototype;

    ACproto.setup = function () {
        put(this.elem, 'span.title', this.name);
        ['record', 'play', 'erase'].forEach(function (action) {
            this.buttons[action] = put(this.elem, 'button.sfx-action.' + action + '[data-action=' + action + ']');
            put(this.buttons[action], 'span.icon.icon-' + action);
        }, this);
        this.elem.addEventListener('click', this.clickHandler.bind(this), false);
        HAM.on('input.start', this.updateButtons.bind(this));
        HAM.on('sound.*.' + this.sound.id, this.updateButtons.bind(this));
        this.updateButtons();
    };

    ACproto.updateButtons = function () {
        var hasInput = !!HAM.input.inputStream;
        var hasSound = !!this.sound.buffer;
        this.buttons.record.disabled = !hasInput || hasSound;
        this.buttons.play.disabled = !hasSound;
        this.buttons.erase.disabled = !hasSound;
    };

    ACproto.clickHandler = function (e) {
        var action = e.target.dataset.action || e.target.parentNode.dataset.action;
        if (action && this[action]) {
            this[action]();
        }
    };

    ACproto.record = function () {
        var iconClasses = this.buttons.record.querySelector('.icon').classList;
        if (this.sound.state == 'recording') {
            this.sound.stopRecording();
            iconClasses.remove('icon-stop');
            iconClasses.add('icon-record');
        } else {
            this.sound.record();
            iconClasses.remove('icon-record');
            iconClasses.add('icon-stop');
        }
    };

    ACproto.play = function () {
        var iconClasses = this.buttons.play.querySelector('.icon').classList;
        if (this.sound.state == 'playing') {
            this.stop();
        } else {
            this.sound.play();
            iconClasses.remove('icon-play');
            iconClasses.add('icon-stop');
            HAM.once('sound.stopPlay.' + this.sound.id, this.stop.bind(this));
        }
    };

    ACproto.stop = function () {
        if (this.sound.state == 'playing') {
            this.sound.stop();
        }
        var iconClasses = this.buttons.play.querySelector('.icon').classList;
        iconClasses.remove('icon-stop');
        iconClasses.add('icon-play');
    };

    ACproto.erase = function () {
        this.sound.erase();
    };

    function setup() {
        var container = $('#audio-controls');
        HAM.sfx.names().forEach(function (name) {
            ui[name] = new AudioControl({
                name: name,
                sound: HAM.sfx.get(name)
            });
            put(container, ui[name].elem);
        });
    }

    setup();

})(this.HAM);