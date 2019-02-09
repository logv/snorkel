var $ = $require("jquery");

var sf_shim = require("snorkel$common/sf_shim.js");
var Throbber = require("views::QuerySidebar/Throbber.js");

function insert_query_tiles(container, queries, in_order) {
  _.each(queries, function(data) {
    sf_shim.add_old_params(data.parsed);
    $C("query_tile", { query: data, icon: "" }, function(tile) {
      tile.$el.hide();
      if (in_order) {
        tile.$el.appendTo(container);
      } else {
        tile.$el.prependTo(container);
      }
      tile.$el.fadeIn(1000);
    });
  });
}

module.exports = {
  events: {
    "change select[name='table']": "handle_table_changed",
    "click .logout" : "handle_logout",
    "click .username" : "handle_user_history",
    "click .toggle_viewarea" : "handle_toggle_viewarea",
    "click .btn.go" : "handle_go_clicked",
  },
  initialize: function(ctx) {
    this.sidebar = ctx.sidebar;
    this.table = ctx.table;
    this.user_modal = ctx.user_modal;
  },
  handle_table_changed: function(e) {
    var table = $(e.target).val();
    window.location = '/query?view=table&table=' + table;
  },


  handle_logout: function() {
    $.post("/logout", function() {
      $(window.location).attr("href", "/");
    });
  },
  handle_toggle_viewarea: function(e) {
    this.sidebar.handle_toggle_viewarea(e);
  },

  handle_user_history: function() {
    // clear out history
    $("#query_queue .query_tile").remove();

    var throbberWrapper = $("<div style='text-align: center' />");
    var tr = Throbber.create(throbberWrapper);
    $("#query_queue .query_list").append(throbberWrapper);
    tr.start();

    this
      .rpc
      .get_saved_queries()
      .kwargs({ table: this.table })
      .done(function(res, err) {
        console.log("RECEIVED QUERIES", res);
        console.log("PLACING IN USER MODAL", this.user_modal);
        var container = $("#query_queue .query_list");
        insert_query_tiles(container, res.recent);
        tr.stop();

      });
  },

  handle_go_clicked: function(e) {
    e.stopPropagation();
    e.preventDefault();
    this.sidebar.handle_go_clicked();

    this.sidebar.show_results();
  }

}
