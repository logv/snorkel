module.exports = {
  initialize: function() {
  },
  events: {
    "change .selector[name='view']" : "handle_view_changed",
    "click .btn.go" : "handle_go_clicked"

  },
  handle_go_clicked: function() {
    console.log("RUNNING QUERY");
    var query = this.get_query();
  },
  get_query: function() {
    var formEl = this.$el.find("form");
    var formParams = formEl.serializeArray();
    console.log("GETTING QUERY FROM UNDER HERE", formParams);

    this
      .rpc
      .run_query(formParams)
      .done(function(res, err) {
        console.log("RES",res);

      });
  },
  handle_view_changed: function() {
    console.log("VIEW CHANGED");

  }

}
