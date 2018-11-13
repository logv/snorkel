"use strict";

var BLACKLIST = {
  id: true,
  _bstontype: true,
  time: true,
  "weight": true,
  "sample_rate": true
};

function get_filter_data() {

  // See controllers/query/server.js, buddy
  var filters = {
    query: [],
    compare: []
  };

  // TODO: push this logic into filter_row component
  $(container).find("#filters .filter_row").each(function() {
    var row = $(this);
    console.log("FILTERS", row);

    var filter_group = row.parents(".filter_group");
    var filter_type = filter_group.attr("data-filter-type") || 'query';

    if (!row.is(":visible")) {
      return;
    }

    var op = row.find(".filter_op").val();
    var value = row.find(".filter_value").val();
    var field = row.find(".filter_field").val();

    filters[filter_type].push([field, op, value]);

  });

  return filters;
}

var FIELDS = {};
var FIELD_TYPES = {};
function set_fields(fields) {
  FIELDS = fields;
}


function set_field_types(field_types) {
  FIELD_TYPES = field_types

}

var compare_area, filter_area, container;
function set_container(el) {
  container = el;
}

function get_compare_area() {
  compare_area = container.find(".compare_filters");
  return compare_area

}

function get_filter_area() {
  filter_area = container.find(".query_filters");
  return filter_area;

}

var _filter_els = [];
function add_filter(filter, compare, force) {
  filter = _.clone(filter);

  var field = filter.shift();
  var op = filter.shift();
  var val = filter.shift();

  var undef = _.isUndefined(val) || _.isNull(val);
  if (undef && !force) {
    return;
  }
  var filters = _filter_els;



  $C("filter_row", { fields: FIELDS, op: op, selected: val, field: field, types: FIELD_TYPES }, function(cmp) {
    filters.push(cmp.$el);
    cmp.set_field(field, FIELD_TYPES[field]);
    cmp.set_value(val);


    // There are some annoying inter-dependencies going on with
    // set_field/set_value above, so we push set_op into a delay
    _.delay(function() { cmp.set_op(op); });

    if (compare) {
      cmp.$el.find(".filter_group")
        .attr("data-filter-type", "compare");

      get_compare_area().append(cmp.$el);
    } else {
      get_filter_area().append(cmp.$el);
    }

  });
}

function add_filter_compare(filter, force) {
  add_filter(filter, true, force);
}

function remove_filters_from_dom() {
  get_compare_area().find(".filter_row").remove();
  get_filter_area().find(".filter_row").remove();
}

// We need field data available here to even make the component... oh noes...
// what should we do?
function set_filter_data(filters, no_add_if_empty) {
  var query = _.filter(filters.query, function(f) { return f[2]; });
  var compare = _.filter(filters.compare, function(f) { return f[2]; });

  _.each(query, function(f) {
    add_filter(f);
  });

  _.each(compare, function(f) {
    add_filter_compare(f);
  });

  var hide_compare = !compare.length;
  if (!no_add_if_empty) {
    if (!query.length) { add_filter(["", "", ""], false, true); }
    if (!compare.length) { add_filter(["", "", ""], true, true); }
  }


  filter_area.show();

//  if (hide_compare) {
//    SF.controller().trigger("hide_compare_filters");
//  } else {
//    SF.controller().trigger("show_compare_filters", true);
//  }

}

function add_or_update_filters(cur_filters, modify, filters) {

  if (!_.isArray(filters)) {
    filters = _.toArray(filters);
  }

  var to_add = [];

  _.each(filters, function(filter) {
    var found;
    _.each(modify, function(filt) {
      if (filt[0] === filter[0]) {
        found = filt;
      }
    });

    if (!found) {
      to_add.push(filter);
      return;
    }

    found[1] = filter[1];
    found[2] = filter[2];
  });

  return to_add;
}

function add_or_update_filter(filters, compare_filters) {
  var cur_filters = get_filter_data();

  var to_add = add_or_update_filters(cur_filters, cur_filters.query, filters);
  var to_add_compare = add_or_update_filters(cur_filters, cur_filters.compare, compare_filters);

  remove_filters_from_dom();
  set_filter_data(cur_filters, true);


  _.each(to_add, function(filter) {

    add_filter(filter);
  });

  _.each(to_add_compare, function(filter) {
    add_filter(filter, true);
  });

}



module.exports = {
  get: get_filter_data,
  set: set_filter_data,
  empty: remove_filters_from_dom,
  add: add_filter,
  add_compare: add_filter_compare,
  add_or_update: add_or_update_filter,
  set_container: set_container,
  set_fields: set_fields,
  set_field_types: set_field_types,
  BLACKLIST: BLACKLIST
};
