"use strict";

var $ = $require("jquery");

module.exports = {
  events: {
    "click a.slide_link" : "handle_slide_click"
  },
  handle_slide_click: function(ev) {
    console.log("HANDLE SLIDE CLICK");
    var target = $(ev.target).data("target");
    var slides = this.$el.find(".slide");
    slides.hide();
    _.each(slides, function(slide) {
      if ($(slide).data("id") === target) {
        $(slide).fadeIn();
      }
    });
  },
  initialize: function() {
    var first_el = this.$el.find(".carousel-control.right")[0];
    $(first_el).trigger("click");
  }
};
