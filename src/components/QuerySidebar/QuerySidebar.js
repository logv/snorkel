var $ = window.jQuery;

module.exports = {
  initialize: function(ctx) {
    console.log("CREATING QUERY SIDEBAR", ctx);
    this.table = ctx.table;
  },
  events: {
    "change .selector[name='view']" : "handle_view_changed",
    "click .btn.go" : "handle_go_clicked"

  },
  handle_go_clicked: function() {
    console.log("HANDLING GO CLICKED");
    this
      .rpc
      .run_query()
      .kwargs({
        query: this.get_query(),
        table: this.table
      })
      .done(function(res, err) {
        console.log("RES IS", res);
        $(".results").text(JSON.stringify(res, null, 2));
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
    var table = this.table;
    var self = this;

    this
      .rpc
      .update_controls()
      .kwargs({ view: view, table: table, query: this.get_query() })
      .done(function(res, err) {
        // we are being replaced?
        self.undelegateEvents();

      });

  }

}
