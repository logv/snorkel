module.exports = { 
  events: {
    "click .save" :  "handle_save_query"
  },

  handle_save_query: function() {
    var data = this.$el.find("form").serialize();

    this.$el.find('.modal').modal('hide');
    var dashboard = this.$el.find(".dashboard select").val() || this.options.dashboard;
    data += "&dashboard=" + dashboard;

    SF.controller().trigger("update_portlet", data);
  }
};
