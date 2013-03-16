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

function addFilterRow(filterButton) {
  // TODO: is that really necessary?
  var table = $(filterButton).parents(".filter_group");

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

  $C("filter_row", { fields: fields }, function(cmp) {
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

    function update_operators() {
      var val = $(evt.target).val(); // i dunno what i'm doing here
      var selector = $(evt.target);
      var control_group = $(evt.target).parents(".filter_row");
      var op = control_group.find(".filter_op");
      var ops = op.find("option").hide();


      var added_ops = null;
      var types = ["integer", "set", "string"];
      var shown = [];
      _.each(ops, function(op) {
        var $op = $(op);
        $op.attr("disabled", true);
        $op.attr("selected", false);

        _.each(types, function(type) {
          if (val.indexOf(type) !== -1 &&
              $op.attr("data-type") === type) {
            $op.attr("disabled", false);

            shown.push(op);
          }
        });

      });

      $(shown).show();

      if (!shown.length) {
        console.log("No operators supported for", val);
      }

      // Select the first op :-)
      $(op).find("option:not(:disabled)")
        .first()
        .attr("selected", true);
    }

    update_operators();
  },

  handle_remove_filter: function(evt) {
    removeFilterRow(evt.target);
  },

  handle_add_filter: function(evt) {
    addFilterRow(evt.target);
  }
};
