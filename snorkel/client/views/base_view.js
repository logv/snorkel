"use strict";

var BaseView = window.Backbone.View.extend({
  _unrendered: true,
  prepare: function(data) {
    // nothing going on here
    return data;
  },
  handle_data: function(data) {
    this.table = data.parsed.table;
    this.server_data = data;
    this.data = this.prepare(data);
    this.query = data;
    if (!this.data) {
      throw("View returned no data during preparation");
    }

    if (!this.options.compare_mode) {
      this.query_finished();
    }
  },
  handle_compare: function(data) {
    this.compare_query = data;
    this.compare_data = this.prepare(data);
    if (!this.compare_data) {
      throw("View returned no data during comparison preparation");
    }

    if (this.data) {
      this.query_finished();
    }
  },

  query_finished: function() {

    var error;
    try {
      error = this.finalize();
    } catch (e) { error = e; console.error(e); }

    // If finalize throws an error...
    if (error) {
      jank.trigger("query:no_samples", this.server_data);
      return;
    }

    if (this._unrendered) {
      this.$el.empty();

      var that = this;
      _.delay(function() {
        that.render();
        that._unrendered = false;
      }, 100);
    }

    this.query_finished = function() { };
  },

  // called after handle_data and handle_compare
  finalize: function() {
    this.finalize = function() {};
  },

  render: function() {

  }
});

module.exports = BaseView;
