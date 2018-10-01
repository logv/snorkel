"use strict";

function update_operators(selector, new_op) {
  var val = new_op;

  if (!new_op) {
    return;
  }

  var control_group = selector.parents(".filter_row");
  var op = control_group.find(".filter_op");
  var ops = op.find("option").hide();

  var added_ops = null;
  var types = ["integer", "set", "string"];
  var shown = [];
  var options = this.options;


  var field_types = options && options.types || {};
  _.each(ops, function(op) {
    var $op = $(op);
    $op.attr("disabled", true);
    $op.attr("selected", false);

    _.each(types, function(type) {
      var field_is_type = val.indexOf(type) !== -1 || field_types[val] === type;
      if (field_is_type && $op.attr("data-type") === type) {
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
  var firstEl = $(op).find("option:not(:disabled)")
    .first()
    .attr("selected", true);

}

module.exports = {
  tagName: "div",
  className: "",
  defaults: {
  },
  client: function(options) {
    this.options.types = this.options.types || options.types;
    this.$el.find(".filter_field").trigger("change", { target: this.$el.find(".filter_field") });

    if (this.options.op) {
      this.set_op(this.options.op);
    }
  },
  set_value: function(val) {
    this.$el.find(".filter_value").val(val);
  },
  set_field: function(val, type) {
    var el = this.$el.find(".filter_field");
    this.$el.find(".filter_field").val(val).change();

    if (val && type) {
      this.update_available_ops(type);
    }
  },
  set_op: function(val) {
    this.$el.find(".filter_op").val(val);
    // Hmmmm. not good encapsulate here
  },
  update_available_ops: function(type) {
    this.update_operators(this.$el.find(".filter_op"), type);
  },
  update_operators: update_operators
};
