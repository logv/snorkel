'use strict';

module.exports = {
  events: {
    "click .popout" :  "handle_portlet_click",
    "click .refresh-button" :  "handle_refresh_query",
    "click .close-button" :  "handle_close_button_click",
    "click .large" :  "handle_portlet_click",
    "click .remove-button" :  "handle_remove_click",
    "click .edit-button" :  "handle_edit_portlet_click",
    "click .edit-query-button" :  "handle_edit_query_click"
  },

  handle_close_button_click: function(evt) {
    this.$el.removeClass("fullscreen");
    $(window).resize();
    evt.stopPropagation();

    this.toggle_reordering();
  },

  toggle_reordering: function() {
    if (this.$el.hasClass("fullscreen")) {
      jank.controller().trigger("stop_dragging");
    } else {
      jank.controller().trigger("start_dragging");
    }
  },

  handle_edit_portlet_click: function(evt) {
    var options = this.options.client_options;
    delete options.el;
    delete options.id;

    options.dashboard = jank.controller().get_dashboard();

    $C("query_portlet_modal", options, function(cmp) { });
  },

  handle_edit_query_click: function() {
    var client_options = this.query;
    $C("save_query_modal", {
      query_id: this.hashid,
      title: client_options.title,
      description: client_options.description,
      edit: true }, function(cmp) { });

  },

  handle_remove_click: function(evt) {
    jank.controller().trigger("remove_portlet", { hashid: this.hashid});
  },

  handle_portlet_click: function(evt) {
    this.$el.toggleClass("fullscreen");
    $(window).resize();
    this.toggle_reordering();
  },

  handle_refresh_query: function() {
    jank.controller().trigger("refresh_query", this.hashid);
  }
};
