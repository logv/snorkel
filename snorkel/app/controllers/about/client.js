"use strict";

module.exports = {
  events: {
    "click a.slide_link" : "handle_slide_click"
  },
  handle_slide_click: function(ev) {
    var target = $(ev.target).data("target");
    var slides = this.$page.find(".slide");
    slides.hide();
    _.each(slides, function(slide) {
      if ($(slide).data("id") === target) {
        $(slide).fadeIn();
      }
    });
  },
  init: function() {
    var first_el = this.$page.find(".slide_link")[0];
    $(first_el).trigger("click");

  }
};
