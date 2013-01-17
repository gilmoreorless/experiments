/**
 * Some basic cross-browser shims for getUserMedia() and requestAnimationFrame()
 *
 * Some code copied from gumShield: https://gist.github.com/f2ac64ed7fc467ccdfe3
 *
 * "Shim shiminy, shim shiminy, shim shim shimee"
 */

(function (window) {
    // window.URL normalisation
    window.URL = window.URL || window.webkitURL || window.msURL || window.oURL;
    // navigator.getUserMedia normalisation
    navigator.getUserMedia = navigator.getUserMedia ||
                             navigator.webkitGetUserMedia ||
                             navigator.mozGetUserMedia ||
                             navigator.msGetUserMedia ||
                             function (opts, success, fail) {
                                 fail();
                             };
    // Convenience method for setting user media source on a <video>
    window.setStreamSrc = function (video, stream) {
        if (navigator.mozGetUserMedia) {
            video.mozStreamSrc = stream;
        } else {
            video.src = window.URL && window.URL.createObjectURL ? window.URL.createObjectURL(stream) : stream;
        }
    };

    // requestAnimationFrame() normalisation
    window.requestAnimationFrame = window.requestAnimationFrame ||
                                   window.webkitRequestAnimationFrame ||
                                   window.mozRequestAnimationFrame ||
                                   window.msRequestAnimationFrame ||
                                   window.oRequestAnimationFrame ||
                                   function (func) {
                                       return setTimeout(func, 1000 / 24);
                                   };
    // cancelAnimationFrame() normalisation
    window.cancelAnimationFrame = window.cancelAnimationFrame ||
                                  window.webkitCancelAnimationFrame ||
                                  window.mozCancelAnimationFrame ||
                                  window.msCancelAnimationFrame ||
                                  window.oCancelAnimationFrame ||
                                  function (id) {
                                      return clearTimeout(id);
                                  };
})(this);