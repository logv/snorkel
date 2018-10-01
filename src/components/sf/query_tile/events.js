"use strict";

module.exports = {
  events: {
    "click .title" :  "handle_title_click",
    "click .delete" :  "handle_delete_click"
  },

  handle_title_click: function() {
    SF.trigger("query_id_clicked", this.options.query);
  },
  handle_delete_click: function(e) {
    var $el = this.$el;
    SF.trigger("delete_query", this.options.query, function() {
       $el.fadeOut(function() {
         $el.remove();
       });
    });
  }
};
