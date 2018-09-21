"use strict";

function removeFilterRow(filterButton) {
  // remove filter
  // To find out the ID of a given row, select its first parent with class
  // 'filter_row' and then find any element with a data-id on it?
  var filterBox = $(filterButton).parents(".filter_group");
  var filterRow = $(filterButton).parents(".filter_row");

  var idEl = filterRow.find("[data-id]");
  var rowId = idEl.attr("data-id");


  var rows = filterBox.find(".filter_row");

  if (rows.length > 1) {
    filterRow.remove();
  } else {
    filterRow
      .find('.filter_value')
      .val("");
  }
}

function addFilterRow(filterButton, filter_row) {
  // TODO: is that really necessary?
  var table = $(filterButton).parents(".filter_group");
  var options = filter_row.options;

  // To find out the ID of a given row, select its first parent with class
  // 'filter_row' and then find any element with a data-id on it?
  var idEl = $(filterButton).parents(".filter_row").find("[data-id]");
  var rowId = idEl.attr("data-id");

  var lastRow = $(".filter_row").last();

  // add new filter
  var fields = {};
  lastRow.find(".filter_field option").each(function(field) {
    var value = $(this).attr("value");
    var label = $(this).html();
    fields[value] = label;
  });

  $C("filter_row", { fields: fields, types: options.types }, function(cmp) {
    console.log("CREATED FILTER ROW", cmp.$el);
    $(table).append(cmp.$el);
  });
}

module.exports = {
  events: {
    "click .addFilter" :  "handle_add_filter",
    "click .removeFilter" :  "handle_remove_filter",
    "change .filter_field" : "handle_field_change"
  },

  handle_field_change: function(evt) {
    var val = $(evt.target).val();
    var selector = $(evt.target);
    this.update_operators(selector, val);
  },

  handle_remove_filter: function(evt) {
    removeFilterRow(evt.target);
  },

  handle_add_filter: function(evt) {
    addFilterRow(evt.target, this);
  }
};
