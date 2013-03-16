"use strict";

module.exports = {
  tagName: "div",
  className: "",
  defaults: {
    content: "default content"
  },
  client: function(options) {
    var type = this.$el.find("input");

    this.$el.find("input").typeahead({
      source: options.source
    });
  }
};
