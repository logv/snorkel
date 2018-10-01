"use strict";

require("./jquery.timeago.js");
module.exports = {
  tagName: "span",
  className: "",
  defaults: {
    time: (new Date()).toISOString()
  },
  client: function() {
    this.$el.find(".timeago").timeago();
  }
};
