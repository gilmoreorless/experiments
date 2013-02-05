(function (HAM) {

    HAM.ui || (HAM.ui = {});
    var ui = HAM.ui.game = {
        btn: {}
    };
    var $ = HAM.$ = function $(selector) {
        return document.querySelector(selector);
    };

    function setup() {
        var container = $('#game-controls');
        ui.btn.start = put(container, 'button', 'Start Game');
        ui.btn.stop = put(container, 'button', 'Stop Game');
        ui.btn.start.addEventListener('click', HAM.game.start, false);
        ui.btn.stop.addEventListener('click', HAM.game.finish, false);
        HAM.on('game.*', setStates);
        setStates();
    }

    function setStates() {
        ui.btn.start.disabled = HAM.game.state.started;
        ui.btn.stop.disabled = !HAM.game.state.started;
    }

    setup();

})(this.HAM);