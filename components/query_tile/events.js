"use strict";

module.exports = { 
  events: {
    "click" :  "handle_template_click"
  },

  handle_template_click: function() {
    jank.controller().trigger("query_tile_clicked", this.options.query);
  }
};
