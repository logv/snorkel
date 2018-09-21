var $ = window.jQuery;

function swapUrl(url) {
  history.pushState({}, "", url);
}

module.exports = {
  initialize: function(ctx) {
    this.table = ctx.table;
    this.viewarea = ctx.viewarea;
    this.$el.fadeIn();
  },
  events: {
    "change .selector[name='view']" : "handle_view_changed",
    "click .btn.go" : "handle_go_clicked"

  },
  handle_go_clicked: function() {
    var queryUrl
    this
      .rpc
      .run_query()
      .kwargs({
        query: this.get_query(),
        table: this.table,
        viewarea: this.viewarea,
      })
      .done(function(res, err) {
        if (!err) {
          swapUrl(res.queryUrl);
        }

      });
  },
  get_query: function() {
    var formEl = this.$el.find("form");
    var formParams = formEl.serializeArray();
    return formParams;
  },
  handle_view_changed: function(evt) {
    var view = $(evt.target).val();
    var table = this.table;
    var self = this;

    this.$el.fadeOut();

    this
      .rpc
      .update_controls()
      .kwargs({ view: view, table: table, query: this.get_query(), viewarea: this.viewarea })
      .done(function(res, err) {
        // we are being replaced?
        self.undelegateEvents();

      });

  }

}
