"use strict";

module.exports = {
  tagName: "span",
  className: "",
  defaults: {
    content: "default content"
  },

  client: function(opts) {
    this.$el.find('.helpover').popover(opts || {});
  }
};
