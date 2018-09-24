"use strict";

// TODO: understand how to put globals into a shared namespace
var chosen = require("./chosen.jquery.js");
var chosenCss = require("./chosen.sass");

module.exports = {
  tagName: "div",
  className: chosenCss.className,
  defaults: {
    options: {}
  },
  initialize: function() {
    var chosen_opts = {
      width: '148px'
    };

    // TODO: touch the width so chosen gets the right width
    // [okay] i'm not sure this actually works, but it's hard to
    // repro chosen getting the wrong width

    this.$el.show();
    this.$el.find(".multiselect-container").removeClass("hidden");
    this.$el.width();
    this.$el.find("select").chosen(chosen_opts);
  }
};
