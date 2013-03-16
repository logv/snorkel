"use strict";

module.exports = {
  tagName: "div",
  className: "",
  defaults: {
  },
  client: function() {
    this.$el.find(".filter_field").change();
  }
};
