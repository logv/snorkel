"use strict";

module.exports = {
  events: {
    "click .title" :  "handle_title_click",
    "click .delete" :  "handle_delete_click"
  },

  handle_title_click: function() {
    jank.controller().trigger("query_tile_clicked", this.options.query);
  },
  handle_delete_click: function(e) {
    var $el = this.$el;
    jank.controller().trigger("delete_query", this.options.query, function() {
       $el.fadeOut(function() {
         $el.remove();

       });
    });
  }
};
