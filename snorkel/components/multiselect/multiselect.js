"use strict";

module.exports = {
  tagName: "div",
  className: "",
  defaults: {
    options: {}
  },
  client: function() {
    var chosen_opts = {};

    if (!this.helpers.isMobile.any()) {
      // TODO: touch the width so chosen gets the right width
      // [okay] i'm not sure this actually works, but it's hard to
      // repro chosen getting the wrong width
      this.$el.width();
      this.$el.find("select").chosen(chosen_opts);
    }

    this.$el.find(".multiselect-container").removeClass("hidden");
  }
};
