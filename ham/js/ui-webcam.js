(function (HAM) {

    HAM.ui || (HAM.ui = {});
    var ui = HAM.ui.webcam = {
        btn: {}
    };
    var $ = HAM.$;
    var inputContainer = $('#input-controls');
    var gameContainer = $('#playing-area .main-canvas');
    var isUsingWebcam = false;
    var isCalibrating = false;
    var isTracking = false;
    var countdownSecs;

    var SHOW_PROJECTION_DEBUG = false;

    function createButton(text, clickHandler) {
        var btn = put(inputContainer, 'button', text);
        btn.addEventListener('click', clickHandler, false);
        return btn;
    }

    function setClass(elem, className, add) {
        if (elem) {
            elem.classList[add !== false ? 'add' : 'remove'](className);
        }
    }

    function showElem(elem, show) {
        setClass(elem, 'hidden', show === false);
    }

    function trackingHandler(result) {
        var canvas = ui.debug.canvas1;
        var ctx = ui.debug.context1;
        var ratio = ui.debug.ratio;
        var video = HAM.video.dom.video;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!isUsingWebcam) {
            return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#0f0';
        var w = result.width * ratio;
        var h = result.height * ratio;
        ctx.strokeRect(result.x * ratio - w / 2, result.y * ratio - h / 2, w, h);

        if (SHOW_PROJECTION_DEBUG) {
            ui.debug.context2.putImageData(HAM.video.tracker.getBackProjectionImg(), 0, 0);
        }
    }

    function showVideo() {
        put(gameContainer, HAM.video.dom.video);
        put(gameContainer, HAM.video.dom.canvas);
        showElem(HAM.video.dom.video);
        showElem(HAM.video.dom.canvas);
        setClass(HAM.video.dom.video, 'calibration');
        setClass(HAM.video.dom.canvas, 'calibration');
    }

    function hideVideo() {
        showElem(HAM.video.dom.video, false);
        showElem(HAM.video.dom.canvas, false);
        setClass(HAM.video.dom.video, 'calibration', false);
        setClass(HAM.video.dom.canvas, 'calibration', false);
    }

    function drawCalibrationOverlay() {
        var ctx = HAM.video.dom.context;
        var r = ui.calibRegion;
        ctx.save();
        ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.restore();
    }

    function showCalibration() {
        isCalibrating = true;
        showVideo();
        showElem(ui.btn.done);
        setStates();

        countdownSecs = 4;
        calibrate();
        // doCountdown();
    }

    function doCountdown() {
        countdownSecs--;
        var ctx = HAM.video.dom.context;
        var width = HAM.video.dom.canvas.width;
        var height = HAM.video.dom.canvas.height;

        ctx.clearRect(0, 0, width, height);
        if (countdownSecs) {
            ctx.save();
            ctx.font = '8em Arial';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 8;
            ctx.strokeText(countdownSecs, width / 2 - 25, height / 2);
            ctx.fillStyle = '#FFF';
            ctx.fillText(countdownSecs, width / 2 - 25, height / 2);
            ctx.restore();
            drawCalibrationOverlay();
            setTimeout(doCountdown, 1000);
        } else {
            calibrate();
        }
    }

    function calibrate() {
        var r = ui.calibRegion;
        HAM.video.calibrate(r.x, r.y, r.w, r.h);
        HAM.video.startTracking();
    }

    function stopCalibration() {
        isCalibrating = false;
        showElem(ui.btn.done, false);
        hideVideo();
        setStates();
    }

    function setStates() {
        var hasWebcam = !!HAM.input.inputStream;
        ui.btn.input.disabled = !hasWebcam;
        if (!hasWebcam) {
            setClass(ui.btn.input, 'active', false);
        }
        ui.btn.calibrate.disabled = !hasWebcam || !isUsingWebcam;
        ui.btn.done.disabled = !hasWebcam || !isUsingWebcam || !isCalibrating || !isTracking;
    }

    function setup() {
        ui.btn.input = createButton('Use Webcam Input', function () {
            isUsingWebcam = !isUsingWebcam;
            HAM.video[isUsingWebcam ? 'start' : 'stop']();
            setClass(ui.btn.input, 'active', isUsingWebcam);
            setStates();
        });
        ui.btn.calibrate = createButton('Calibrate', showCalibration);
        ui.btn.done = createButton('Done', stopCalibration);
        showElem(ui.btn.done, false);

        var videoCanvas = HAM.video.dom.canvas;
        /*
        ui.calibRegion = {
            x: ~~(videoCanvas.width / 5),
            y: ~~(videoCanvas.height / 4),
            w: ~~(videoCanvas.width / 5),
            h: ~~(videoCanvas.height / 4)
        };
        */
        var vw = videoCanvas.width, vh = videoCanvas.height;
        ui.calibRegion = {
            x: ~~(vw / 4),
            y: ~~(vh / 4),
            w: ~~(vw / 2),
            h: ~~(vh / 2)
        };
        // ui.calibRegion = {
        //     x: 0,
        //     y: 0,
        //     w: vw,
        //     h: vh
        // };

        ui.debug = {canvas1: put(inputContainer, 'canvas.debug')};
        var canvas = ui.debug.canvas1;
        ui.debug.context1 = canvas.getContext('2d');
        canvas.width = 160;
        canvas.height = 120;
        ui.debug.ratio = canvas.height / HAM.video.dom.video.height;

        if (SHOW_PROJECTION_DEBUG) {
            canvas = ui.debug.canvas2 = put(inputContainer, 'canvas.debug');
            ui.debug.context2 = ui.debug.canvas2.getContext('2d');
            canvas.width = videoCanvas.width;
            canvas.height = videoCanvas.height;
        }

        HAM.on('input.*', setStates);
        HAM.on('video.tracking.start', function () {
            HAM.on('video.tracking.result', trackingHandler);
            isTracking = true;
            showElem(ui.debug.canvas1);
            if (SHOW_PROJECTION_DEBUG) {
                showElem(ui.debug.canvas2);
            }
            setStates();
        });
        HAM.on('video.tracking.stop', function () {
            HAM.off('video.tracking.result', trackingHandler);
            isTracking = false;
            showElem(ui.debug.canvas1, false);
            if (SHOW_PROJECTION_DEBUG) {
                showElem(ui.debug.canvas2, false);
            }
            setStates();
        });
        setStates();
    }

    setup();

})(this.HAM);