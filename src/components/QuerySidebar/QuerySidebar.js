var $ = window.jQuery;

module.exports = {
  initialize: function() {
  },
  events: {
    "change .selector[name='view']" : "handle_view_changed",
    "click .btn.go" : "handle_go_clicked"

  },
  handle_go_clicked: function() {
    var query = this.get_query();
    this
      .rpc
      .run_query()
      .kwargs({
        query: query
      })
      .done(function(res, err) {
        console.log("RES",res);

      });
  },
  get_query: function() {
    var formEl = this.$el.find("form");
    var formParams = formEl.serializeArray();
    console.log("GETTING QUERY FROM UNDER HERE", formParams);
    return formParams;

  },
  handle_view_changed: function(evt) {
    var view = $(evt.target).val();
    var table = "hostest";

    this
      .rpc
      .update_controls()
      .kwargs({ view: view, table: table });

  }

}
