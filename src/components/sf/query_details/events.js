"use strict";

module.exports = { 
  events: {
    "click .refresh" :  "refresh_query",
    "click .history" :  "see_query_history"
  },

  see_query_history: function() {
    SF.controller().trigger("show_query_history", this.options.query);
  },
  refresh_query: function() {
    SF.controller().trigger("refresh_query", this.options.query);
  }
};
