"use strict"

var filter_helper = require("./filters.js");
var Throbber = require("./Throbber.js");
var StatusBar = require("./StatusBar.js");
var views = require("./view.js");

var $ = window.jQuery;

function serialized_array_to_str(arr) {

  var form_str = _.map(arr, function(f) { return f.name + "=" + f.value; }).join('&');

  return form_str;
}


function swapUrl(url) {
  history.pushState({}, "", url);
}

$(window).on("click", function(e) {
  var target = $(e.target).closest("a");
  if (target.attr('href') == "#") {
    e.preventDefault();
  }
});

window.onpopstate = function(event) {
  window.location.reload();
};

module.exports = {
  events: {
    "change .selector[name='view']" : "handle_view_changed",
    "click .custom_time_inputs" : "handle_custom_time_inputs",
    "click .compare_filter" : "handle_compare_toggle",
    "click .custom_field_inputs" : "handle_custom_fields_input",
  },
  initialize: function(ctx) {
    var self = this;
    self.$page = $("body");
    this.table = ctx.table;
    this.viewarea = ctx.viewarea;
    SF.on("set_custom_time", function(start, end) {
      self.show_custom_time_inputs();
      self.set_custom_time_inputs(start, end);
    })


    // listen for someone wanting to change views
    self.on("switch_views", function(view) {
      console.log("SWITCHING VIEWS", view);
      self.$el.find(".selector[name=view]").val(view).change();
    });

    $('body').on("click", function() {
      SF.emit("page:clicked");
    });

    filter_helper.set_container(this.$el);
    filter_helper.set_fields(ctx.fields);
    filter_helper.set_field_types(ctx.metadata.col_types);
    this.filters = filter_helper;

    this.$el.fadeIn();
  },
  handle_go_clicked: function() {
    var queryUrl;
    var filters = filter_helper.get();
    var self = this;
    self.$page = $("body");

    var _start = +new Date();
    function get_text() {
      // For the first second, look like we're sending the query to the server :-)
      if (Date.now() - _start > 1000) {
        ret = "Running Query";
      } else {
        ret = "Uploading Query";
      }

      return $("<h1>")
        .html(ret);

    }

    var viewEl = this.viewarea.$el;
    viewEl.html("");

    throbber = Throbber.create(viewEl, get_text);
    throbber.tick(function(elapsed) {
      StatusBar.set_query_time(elapsed);
    });
    throbber.start();

    this
      .rpc
      .run_query()
      .kwargs({
        query: this.get_query(),
        table: this.table,
        filters: filters,
        viewarea: this.viewarea,
      })
      .before(function(res, err) {
      })
      .done(function(res, err) {
        throbber.stop();
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

    var filters = filter_helper.get();
    var viewEl = views.get_control_row("view");

    throbber = $("<div class='spinner' />");
    viewEl.prepend(throbber);

    this
      .rpc
      .update_controls()
      .kwargs({ view: view, table: table, query: this.get_query(), viewarea: this.viewarea, filters: filters })
      .done(function(res, err) {
        throbber.remove();
      });

  },

  set_custom_time_inputs: function(start, end) {
    var customStartRow = views.get_control_row("custom_start");
    var customEndRow = views.get_control_row("custom_end");

    var start_str = start.toLocaleDateString('en-us') + " " + start.toLocaleTimeString('en-us');
    var end_str = end.toLocaleDateString('en-us') + " " + end.toLocaleTimeString('en-us');

    var offset = start.getTimezoneOffset();
    var hours = offset / 60 * 100;

    start_str += " GMT-" + hours;
    end_str += " GMT-" + hours;

    customStartRow.find("input[type=text]").val(start_str);
    customEndRow.find("input[type=text]").val(end_str);
  },

  show_custom_time_inputs: function() {
    var startControl = views.get_control_row("start");
    var endControl = views.get_control_row("end");

    var customStartRow = views.get_control_row("custom_start");
    var customEndRow = views.get_control_row("custom_end");

    customStartRow.removeClass("hidden");
    customEndRow.removeClass("hidden");

    startControl.slideUp();
    endControl.slideUp();

    customStartRow.slideDown();
    customEndRow.slideDown();

    startControl.addClass('hidden');
    endControl.addClass('hidden');

    this.$el.find(".custom_time_inputs").text("quick select time");



  },
  hide_custom_time_inputs: function() {
    var startControl = views.get_control_row("start");
    var endControl = views.get_control_row("end");

    var customStartRow = views.get_control_row("custom_start");
    var customEndRow = views.get_control_row("custom_end");

    views.set_control("custom_start", "");
    views.set_control("custom_end", "");

    startControl.removeClass('hidden');
    endControl.removeClass('hidden');

    customStartRow.slideUp();
    customEndRow.slideUp();
    startControl.slideDown();
    endControl.slideDown();

    customStartRow.addClass("hidden");
    customEndRow.addClass("hidden");

    this.$el.find(".custom_time_inputs").text("use custom time");
  },

  handle_custom_time_inputs: function() {
    if (views.get_control_row("start").is(":visible")) {
      this.show_custom_time_inputs();
    } else if (views.get_control_row("custom_start").is(":visible")) {
      this.hide_custom_time_inputs();
    }
  },

  show_custom_fields_input: function() {
    var fieldsControl = views.get_control_row("fields[]");
    var aggControl = views.get_control_row("metric");

    var customFieldsRow = views.get_control_row("custom_fields[]");

    customFieldsRow.removeClass("hidden");
    fieldsControl.finish().slideUp();
    aggControl.finish().slideUp();
    customFieldsRow.finish().slideDown();
    customFieldsRow.find("select").attr("data-disabled", false);
    fieldsControl.find("select").attr("data-disabled", true);

    fieldsControl.addClass('hidden');
    aggControl.addClass('hidden');

    this.$el.find(".custom_field_inputs").text("quick select fields");
  },
  hide_custom_fields_input: function() {
    var fieldsControl = views.get_control_row("fields[]");
    var aggControl = views.get_control_row("metric");
    var customFieldsRow = views.get_control_row("custom_fields[]");

    fieldsControl.removeClass('hidden');
    aggControl.removeClass('hidden');

    customFieldsRow.finish().slideUp();
    customFieldsRow.find("select").attr("data-disabled", true);
    fieldsControl.find("select").attr("data-disabled", false);
    fieldsControl.finish().slideDown();
    aggControl.finish().slideDown();

    customFieldsRow.addClass("hidden");

    this.$el.find(".custom_field_inputs").text("use custom fields");
  },

  handle_custom_fields_input: function() {
    if (views.get_control_row("fields[]").is(":visible")) {
      this.show_custom_fields_input();
    } else if (views.get_control_row("custom_fields[]").is(":visible")) {
      this.hide_custom_fields_input();
    }
  },

  supports_compare_filters: function(f) {
    var compareFilter = this.$page.find(".compare_filter");
    if (f) {
      compareFilter.show();
    } else {
      compareFilter.hide();
    }
  },

  show_compare_filters: function(add_if_empty) {
    console.log("SHOWING COMPARE FILTERS");
    var filterBox = this.$page.find(".filter_group[data-filter-type=compare]");
    var compareFilter = this.$page.find(".compare_filter");
    filterBox.show();
    compareFilter.show();

    // If there is no filter row and we want to show comparison filters
    if (!filterBox.find(".filter_row").length && add_if_empty) {
      filter_helper.add_compare(["", "", ""], true);
    }

    compareFilter.html("Remove Comparison Filters");
    var container = filterBox.parents("#query_sidebar");
    container.stop(true).animate({
        scrollTop: filterBox.offset().top - container.offset().top + container.scrollTop()
    }, 1000);

  },

  hide_compare_filters: function() {
    console.log("HIDING COMPARE FILTERS");
    var filterBox = this.$page.find(".filter_group[data-filter-type=compare]");
    var compareFilter = this.$page.find(".compare_filter");
    filterBox.hide();
    compareFilter.html("Add Comparison Filters");
  },

  handle_compare_toggle: _.debounce(function() {
    var filterBox = this.$page.find(".filter_group[data-filter-type=compare]");

    var to_hide = $(filterBox).is(":visible") && filterBox.find(".filter_row").length;

    if (to_hide) {
      this.hide_compare_filters();
    } else {
      this.show_compare_filters(true /* add if empty */);
    }

  }, 50),

  hide_results: function() {
    console.log("HIDING RESULTS");

    var btn = $(".toggle_viewarea");
    var sidebar_pane = this.$el.parents(".sidebar_pane");
    btn.text("Show Results");
    $(".btn.go").addClass("display");
    sidebar_pane.addClass("active");
    this.viewarea.$el.parents(".results").removeClass("active");

  },

  show_results: function() {
    console.log("SHOWING RESULTS");
    var btn = $(".toggle_viewarea");
    var sidebar_pane = this.$el.parents(".sidebar_pane");
    btn.text("Show Query");

    $(".btn.go").removeClass("display");
    sidebar_pane.removeClass("active");
    this.viewarea.$el.parents(".results").addClass("active");
  },

  handle_toggle_viewarea: function(e) {
    var to_hide = this.$el.find(".sidebar").is(":visible");

    // if we are to_hide the sidebar, we show_results
    if (to_hide) {
      this.show_results();
    } else {
      this.hide_results();
    }
  },
}
