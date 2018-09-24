var filter_helper = require("QuerySidebar/filters.js");
var $ = window.jQuery;


function serialized_array_to_str(arr) {

  var form_str = _.map(arr, function(f) { return f.name + "=" + f.value; }).join('&');

  return form_str;
}


function swapUrl(url) {
  history.pushState({}, "", url);
}

module.exports = {
  initialize: function(ctx) {
    this.table = ctx.table;
    this.viewarea = ctx.viewarea;
    console.timeStamp("FADING IN");
    this.$el.fadeIn();

    filter_helper.set_container(this.$el);
  },
  events: {
    "change .selector[name='view']" : "handle_view_changed",
    "click .btn.go" : "handle_go_clicked"

  },
  handle_go_clicked: function() {
    var queryUrl
    var filters = filter_helper.get();
    var self = this;
    self.$page = $("body");

    this
      .rpc
      .run_query()
      .kwargs({
        query: this.get_query(),
        table: this.table,
        filters: filters,
        viewarea: this.viewarea,
      })
      .done(function(res, err) {
        if (!err) {
          swapUrl(res.queryUrl);
        }

      });
  },
  dom_to_query_str: function() {
    var formEl = this.$el.find("form");
    var form_data = formEl.serializeArray();
    var form_str = serialized_array_to_str(form_data);

    var filter_data = filter_helper.get(this.$page);

    var json_filters = JSON.stringify(filter_data);
    form_str += "&filters=" + json_filters;

//    var customForm = this.$page.find("#query_sidebar form.custom_controls");
//    var custom_obj = customForm.serializeObject();
//    var json_custom = JSON.stringify(custom_obj);
//    form_str += "&custom=" + json_custom;

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
    var filters = filter_helper.get();

    this
      .rpc
      .update_controls()
      .kwargs({ view: view, table: table, query: this.get_query(), viewarea: this.viewarea, filters: filters })
      .done(function(res, err) {
        // we are being replaced?
        self.undelegateEvents();

      });

  }

}
