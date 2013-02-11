(function (HAM) {

    HAM.ui || (HAM.ui = {});
    var ui = HAM.ui.webcam = {
        btn: {}
    };
    var $ = HAM.$;
    var inputContainer = $('#input-controls');
    var gameContainer = $('#playing-area .main-canvas');
    var isCalibrating = false;
    var isTracking = false;

    function createButton(text, clickHandler) {
        var btn = put(inputContainer, 'button', text);
        btn.addEventListener('click', clickHandler, false);
        return btn;
    }

    function showElem(elem, show) {
        elem.classList[show !== false ? 'remove' : 'add']('hidden');
    }

    function headtrackrStatusHandler(e) {
        if (e.status === 'found') {
            isTracking = true;
            document.removeEventListener('headtrackrStatus', headtrackrStatusHandler, false);
            setStates();
        }
    }

    function showVideo() {
        put(gameContainer, HAM.video.dom.video);
        showElem(HAM.video.dom.video);
    }

    function hideVideo() {
        showElem(HAM.video.dom.video, false);
    }

    function showCalibration() {
        isCalibrating = true;
        isTracking = false;
        document.addEventListener('headtrackrStatus', headtrackrStatusHandler, false);
        showVideo();
        showElem(ui.btn.done);
        HAM.video.calibrate();
        HAM.video.startTracking();
        setStates();
    }

    function stopCalibration() {
        isCalibrating = false;
        showElem(ui.btn.done, false);
        hideVideo();
        setStates();
    }

    function setStates() {
        var hasWebcam = !!HAM.input.inputStream;
        ui.btn.start.disabled = hasWebcam;
        // ui.btn.stop.disabled = !hasWebcam;
        ui.btn.calibrate.disabled = !hasWebcam || isCalibrating;
        ui.btn.done.disabled = !hasWebcam || !isCalibrating || !isTracking;
    }

    function setup() {
        ui.btn.start = createButton('Start Webcam', function () {
            HAM.video.start();
        });
        /*
        ui.btn.stop = createButton('Stop Webcam', function () {
            HAM.video.stop();
        });
        */
        ui.btn.calibrate = createButton('Calibrate', showCalibration);
        ui.btn.done = createButton('Done', stopCalibration);
        showElem(ui.btn.done, false);
        HAM.on('input.*', setStates);
        setStates();
    }

    setup();

})(this.HAM);