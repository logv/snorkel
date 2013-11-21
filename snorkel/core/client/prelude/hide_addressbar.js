"use strict";

(function() {
  function hideAddressBar() {

    var width = (window.innerWidth > 0) ? window.innerWidth : window.screen.width;
    var document = window.document;
    if (width < 768) {
      if (document.documentElement.scrollHeight<window.outerHeight/window.devicePixelRatio) {
        document.documentElement.style.height=(window.outerHeight/window.devicePixelRatio)+'px';
      }

      setTimeout(window.scrollTo(1,1),0);

    }
  }

  $(function() {
    console.log("Bring forth the SF (prelude loaded)");
  });

  $(function() {
    var fc = new FastClick(window.document.body);
    hideAddressBar();
    window.addEventListener("orientationchange", hideAddressBar);
  });


  var MODULE_PREFIX="var module = {}; (function() {\n";
  var MODULE_SUFFIX="})(); module.exports";

  function raw_import(str) {
    return eval(MODULE_PREFIX + str + MODULE_SUFFIX);
  }
}());
