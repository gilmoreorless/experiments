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

    // getUserMedia normalisation and backwards compatibility
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        window.getUserMedia = function (opts, success, fail) {
            return navigator.mediaDevices.getUserMedia(opts).then(success).catch(fail);
        }
    } else {
        window.getUserMedia = navigator.getUserMedia ||
                              navigator.webkitGetUserMedia ||
                              navigator.mozGetUserMedia ||
                              navigator.msGetUserMedia ||
                              function (opts, success, fail) {
                                  fail && fail();
                              };
    }

    // Convenience method for setting user media source on a <video>
    window.setStreamSrc = function (video, stream) {
        if ('srcObject' in video) {
            video.srcObject = stream;
        } else if (navigator.mozGetUserMedia) {
            video.mozSrcObject = stream;
        } else {
            video.src = window.URL && window.URL.createObjectURL ? window.URL.createObjectURL(stream) : stream;
        }
        video.play();
    };

    window.removeStreamSrc = function (video) {
        video.pause();
        if (video.srcObject) {
            video.srcObject.getVideoTracks().forEach(t => t.stop());
            video.srcObject = null;
        } else if (video.mozSrcObject) {
            video.mozSrcObject = '';
        }
        video.src = '';
    };

    // AudioContext normalisation
    window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext;

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

/**
 * Analytics - might as well put this here since this file is included everywhere anyway
 */
var _gaq = _gaq || [];
if (~location.hostname.indexOf('github.io')) {
    _gaq.push(['_setAccount', 'UA-8341018-3']);
    _gaq.push(['_trackPageview']);

    (function() {
        var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
        ga.src = 'https://ssl.google-analytics.com/ga.js';
        var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
    })();
}
