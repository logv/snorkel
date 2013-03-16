"use strict";
module.exports = {
  tagName: "div",
  className: "",
  defaults: {
    time: (new Date()).toISOString()
  },
  client: function() {
    this.$el.find(".timeago").timeago();
  }
};
