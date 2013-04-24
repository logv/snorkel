"use strict";

module.exports = {
  tagName: "div",
  className: "xeditable",
  defaults: {
    content: "default content"
  },
  client: function(options) {
    var that = this;
    $.fn.editable.defaults.mode = 'inline'; // yeah yeah yeah

    this.editable = this.$el.find('a').editable(options).on('save', function() {
      var args = _.toArray(arguments);
      args.unshift("save");
      that.trigger.apply(that, args);
    });

    this.editable.on("shown", function() {
      that.trigger("shown");
    });

    this.editable.on("hidden", function() {
      that.trigger("hidden");
    });
  },
  activate: function() {
    this.editable.editable("show");
  }
};
