var BLACKLIST = {
  id: true,
  _bstontype: true,
  time: true,
  "weight": true,
  "sample_rate": true
};

function get_filter_data(el) {

  // See controllers/query/server.js, buddy
  var filters = {
    query: [],
    compare: []
  };

  // TODO: push this logic into filter_row component
  $(el).find("#filters .filter_row").each(function() {
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

// We need field data available here to even make the component... oh noes...
// what should we do?
function set_filter_data(el, filters, fields) {
  var typed_fields = {};
  _.each(fields, function(field) {
    if (BLACKLIST[field.name] || BLACKLIST[field.type_str]) {
      return;
    }

    typed_fields[field.type_str + "." + field.name] = field.name;
  });


  var compare_area = el.find(".compare_filters");
  var filter_area = el.find(".query_filters");

  function add_filter(filter, compare, force) {
    var field = filter.shift();
    var op = filter.shift();
    var val = filter.shift();

    // skip empty filters, ideally
    if (!val && !force) {
      return;
    }

    $C("filter_row", { fields: typed_fields }, function(cmp) {
      cmp.$el.find(".filter_value").val(val);
      cmp.$el.find(".filter_field").val(field);
      cmp.$el.find(".filter_op").val(op);

      if (compare ) {
        cmp.$el.find(".filter_group")
          .attr("data-filter-type", "compare");

        compare_area.append(cmp.$el);
      } else {
        filter_area.append(cmp.$el);
      }

    });
  }

  function add_filter_compare(filter) {
    add_filter(filter, true);
  }

  compare_area.find(".filter_row").remove();
  filter_area.find(".filter_row").remove();

  filters.query = _.filter(filters.query, function(f) { return f[2]; });
  filters.compare = _.filter(filters.compare, function(f) { return f[2]; });

  _.each(filters.query, add_filter);
  _.each(filters.compare, add_filter_compare);

  if (!filters.query.length) { add_filter(["", "", ""], false, true); }
  if (!filters.compare.length) { add_filter(["", "", ""], true, true); }
  var hide_compare = !filters.compare.length;

  if (hide_compare) {
    compare_area.hide();
  } else {
    compare_area.show();
  }
}


module.exports = {
  get: get_filter_data,
  set: set_filter_data,
  BLACKLIST: BLACKLIST
};
