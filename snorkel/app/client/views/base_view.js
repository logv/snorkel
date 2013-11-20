"use strict";

var presenter = require("app/client/views/presenter");

var BaseView = window.Backbone.View.extend({
  _unrendered: true,
  prepare: function(data) {
    // nothing going on here
    return data;
  },
  handle_data: function(data) {
    this.table = data.parsed.table;

    function get_text() {
      return $("<h1>").html("Waiting for comparison");
    }

    if (this.options.throbber) {
      this.options.throbber.set_text_function(get_text);
    }

    SF.do_when(presenter.get_fields(this.table),
      'query:fields',
      _.bind(function() {
        this.server_data = data;
        this.data = this.prepare(data);
        this.query = data;
        if (!this.data) {
          throw("View returned no data during preparation");
        }

        if (!this.options.compare_mode) {
          this.query_finished();
        }

        if (this.options.compare_mode) {
          if (this.options.throbber) {
            this.options.throbber.start();
          }
        }
      }, this));
  },
  handle_compare: function(data) {
    this.compare_query = data;
    SF.do_when(presenter.get_fields(this.table),
      'query:fields',
      _.bind(function() {
        this.compare_data = this.prepare(data);
        if (!this.compare_data) {
          throw("View returned no data during comparison preparation");
        }

        if (this.data) {
          this.query_finished();
        }
      }, this));
  },

  query_finished: function() {
    if (this.options.throbber) {
      this.options.throbber.stop();
    }
    var error;
    try {
      error = this.finalize();
    } catch (e) { error = e; console.error(e); }

    // If finalize throws an error...
    if (error) {
      SF.trigger("query:no_samples", this.server_data);
      return;
    }

    if (this._unrendered) {
      this.$el.empty();

      var that = this;
      _.delay(function() {
        var start = Date.now();
        that.render();
        console.log("VIEW RENDER TIME", Date.now() - start);
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
