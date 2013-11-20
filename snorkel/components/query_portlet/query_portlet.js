module.exports = {
  tagName: "div",
  className: "",
  client: function(client_options) {
    var that = this;
    var $el = this.$el;

    var hashid = this.hashid = client_options.hashid;
    this.clientid = client_options.clientid;
    this.query = client_options;
    SF.controller("dashboard", function(cntrl) {
      cntrl.trigger("new_portlet", client_options, $el.find(".query_portlet"));

      $el.find(".portlet_wrapper").show();
    });

    SF.socket().on("saved_query", function(query) {
      if (query.hashid === hashid) {
        that.query = query;
        $el.find(".query_title").html(query.title);
      }
    });

  }
};
