"use strict";

module.exports = { 
  events: {
    "click" :  "handle_template_click"
  },

  handle_template_click: function(evt) {
    jank.trigger("page:clicked");
  }
};
