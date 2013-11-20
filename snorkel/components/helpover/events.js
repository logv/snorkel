"use strict";

module.exports = { 
  events: {
    "click" :  "handle_helpover_click"
  },

  hide: function() {
    this._showing = false;
    this.$el.find('.helpover').popover('hide');
  },

  show: function() {
    this._showing = true;
    this.$el.find('.helpover').popover('show');
  },

  handle_helpover_click: function() {
    var self = this;
    if (this._showing) {
      this.hide();
    } else {
      this.show();

      _.delay(function() {
          SF.once("page:clicked", function() {
            self.hide();
          });
        }, 100);

    }
  }
};
