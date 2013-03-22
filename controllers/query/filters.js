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

var typed_fields = {};
var field_types = {};
function set_fields(fields) {
  _.each(fields, function(field) {
    if (BLACKLIST[field.name] || BLACKLIST[field.type_str]) {
      return;
    }

    typed_fields[field.type_str + "." + field.name] = field.name;
    field_types[field.name] = field.type_str;
  });
}

function get_field_type(field_name) {
  return field_types[field_name];
}

var compare_area, filter_area, container;
function set_container(el) {
  container = el;
  compare_area = el.find(".compare_filters");
  filter_area = el.find(".query_filters");
}

function add_filter(filter, compare, force) {
  filter = _.clone(filter);

  var field = filter.shift();
  var op = filter.shift();
  var val = filter.shift();

  if (!val && !force) {
    return;
  }

  $C("filter_row", { fields: typed_fields, op: op, selected: val, field: field }, function(cmp) {
    cmp.set_field(field);
    cmp.set_value(val);
    cmp.set_op(op);

    if (compare) {
      cmp.$el.find(".filter_group")
        .attr("data-filter-type", "compare");

      compare_area.append(cmp.$el);
    } else {
      filter_area.append(cmp.$el);
    }

  });
}

function add_filter_compare(filter, force) {
  add_filter(filter, true, force);
}
// We need field data available here to even make the component... oh noes...
// what should we do?
function set_filter_data(filters, no_add_if_empty) {
  filter_area.fadeOut();
  compare_area.fadeOut();

  compare_area.find(".filter_row").remove();
  filter_area.find(".filter_row").remove();

  var query = _.filter(filters.query, function(f) { return f[2]; });
  var compare = _.filter(filters.compare, function(f) { return f[2]; });

  _.each(query, function(f) {
    add_filter(f);
  });
  _.each(compare, function(f) {
    add_filter_compare(f);
  });

  if (!no_add_if_empty) {
    if (!query.length) { add_filter(["", "", ""], false, true); }
    if (!compare.length) { add_filter(["", "", ""], true, true); }
  }

  var hide_compare = !compare.length;

  filter_area.fadeIn();
  if (hide_compare) {
    compare_area.hide();
  } else {
    compare_area.fadeIn();
  }

}

function add_or_update_filter(filters, compare) {
  var cur_filters = get_filter_data();
  var modify = compare ? cur_filters.compare : cur_filters.query;

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
      to_add.push([filter, compare]);
      return;
    }

    found[1] = filter[1];
    found[2] = filter[2];
  });

  set_filter_data(cur_filters, filters.length > 0);

  _.each(to_add, function(filter_data) {
    add_filter.apply(null, filter_data);
  });

}


module.exports = {
  get: get_filter_data,
  set: set_filter_data,
  add: add_filter,
  add_compare: add_filter_compare,
  add_or_update: add_or_update_filter,
  set_container: set_container,
  set_fields: set_fields,
  get_field_type: get_field_type,
  BLACKLIST: BLACKLIST
};
