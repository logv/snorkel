"use strict";

module.exports = {
  events: {
    "click .query_history_result" :  "handle_query_click"
  },

  handle_query_click: function(e) {
    var $el = this.$el;
    jank.controller().trigger("query_id_clicked", this.options.query, function() {
      console.log("THIS OPTIONS", this.option);
    });
  }
};
