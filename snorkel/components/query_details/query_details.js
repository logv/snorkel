"use strict";

module.exports = {
  tagName: "div",
  className: "",
  client: function(options) {
    var created_str = new Date(options.created).toISOString();
    var that = this;
    $C("timeago", {time: created_str }, function(cmp) {
      that.$el.find(".timestamp").append(cmp.$el);
    });
  }
};
