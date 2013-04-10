"use strict";

module.exports = { 
  events: {
    "click .refresh" :  "refresh_query",
    "click .history" :  "see_query_history"
  },

  see_query_history: function() {
    jank.controller().trigger("show_query_history", this.options.query);
  },
  refresh_query: function() {
    jank.controller().trigger("refresh_query", this.options.query);
  }
};
