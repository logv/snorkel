"use strict";

var ResultsStore = require("client/js/results_store");

module.exports = {
  events: {
    "click .save" :  "handle_save_query"
  },

  handle_save_query: function() {
    var title = this.$el.find("input[name=title]").val();
    var description = this.$el.find("textarea[name=description]").val();

    var query_id = this.options.query_id;

    this.$el.find('.modal').modal('hide');

    var server_id = ResultsStore.to_server(query_id);

    var query = {
      hashid: server_id,
      clientid: query_id
    };

    jank.controller().trigger("rename_query", query, title, description);
  }
};
