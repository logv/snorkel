"use strict";

var ResultsStore = require("app/client/results_store");

module.exports = {
  events: {
    "click .save" :  "handle_save_query"
  },

  handle_save_query: function() {
    var title = this.$el.find("input[name=title]").val();
    var description = this.$el.find("textarea[name=description]").val();

    var query_id = this.options.query_id;

    this.$el.find('.modal').modal('hide');

    var query = {
      hashid: query_id
    };

    SF.controller().trigger("rename_query", query, title, description);
  }
};
