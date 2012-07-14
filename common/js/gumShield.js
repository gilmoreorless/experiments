/**
 * The gUM Shield
 * Taken from https://gist.github.com/f2ac64ed7fc467ccdfe3 and modified for my use
 * See http://html5doctor.com/getusermedia/ for details
 */

(function () {
  //normalize window.URL
  window.URL || (window.URL = window.webkitURL || window.msURL || window.oURL);

  //normalize navigator.getUserMedia
  navigator.getUserMedia || (navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

  //detect if {video: true} or "video" style options
  //by creating an iframe and blowing it up
  //style jacked from @kangax
  var optionStyle = (function(win){
    //only test if there's something to test
    if (!navigator.getUserMedia) return;

    var el = document.createElement('iframe'),
    root = document.body || document.documentElement,
    string = true, object = true, nop = function(){};
    root.appendChild(el);

    var f = win.frames[win.frames.length-1];

    f.navigator.getUserMedia || (f.navigator.getUserMedia = f.navigator.webkitGetUserMedia || f.navigator.mozGetuserMedia || f.navigator.msGetUserMedia);

    try { //try it with spec syntax
      f.navigator.getUserMedia({video: true}, nop);
    } catch (e) {
      object = false;
      try { //try it with old spec string syntax
        f.navigator.getUserMedia("video", nop);
      } catch (e) { //neither is supported
        string = false;
      }
    } finally { //clean up
      root.removeChild(el);
      el = null;
    }

    return {string: string, object: object};
  })(window);

  //normalize the options object to a string
  //if that's the only thing supported
  var norm = function(opts){ // has to be {video: false, audio: true}. caveat emptor.
    var stringOptions = [];

    if (optionStyle.string && !optionStyle.object) {
      //pluck the "true"s
      for (var o in opts) {
        if (opts[o]) {
          stringOptions.push(o);
        }
      }
      return stringOptions.join(" ");
    } else {

    //really, this will blow up if you pass it {video: true, rofl: "copter"}. so don't.
    return opts;
    }
  };

  window.getStreamSrc = function(stream) {
    return (window.URL && window.URL.createObjectURL) ? window.URL.createObjectURL(stream) : stream;
  };

})();
