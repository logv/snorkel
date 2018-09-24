var $ = $require("jquery");

module.exports = {
  events: {
    "change select[name='table']": "handle_table_changed"
  },
  initialize: function(ctx) {
    this.sidebar = ctx.sidebar;
  },
  handle_table_changed: function(e) {
    var table = $(e.target).val();
    window.location = '/query?view=table&table=' + table;
  }

}
