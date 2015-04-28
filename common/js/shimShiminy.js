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
            video.mozSrcObject = stream;
        } else {
            video.src = window.URL && window.URL.createObjectURL ? window.URL.createObjectURL(stream) : stream;
        }
        video.play();
    };

    window.removeStreamSrc = function (video) {
        video.pause();
        if (video.mozSrcObject) {
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

    // Custom method to check support for certain features
    // Possible options: {audio:true, video:true, webAudio:true}
    window.hasFeatureSupport = function (features) {
        features || (features = {});
        var hasGUM = !!navigator.getUserMedia;
        var canGetMic = hasGUM && (function () {
            // Yeah, user agent sniffing is bad, but there's no other way
            var supported = {Chrome: 24, Firefox: 18};
            var matcher = /(Chrome|Firefox)\/(\d+)/;
            var match = matcher.exec(navigator.userAgent);
            if (!match) return false;
            var minVersion = supported[match[1]];
            return minVersion <= +match[2];
        })();
        return !(
            (features.webAudio && !window.AudioContext) ||
            (features.video && !hasGUM) ||
            (features.audio && !canGetMic)
        );
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
