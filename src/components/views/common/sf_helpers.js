"use strict";

require("vendor/hex-rgb.src.js");

var color_hashes = {};
var COLORS = [
  '#4572A7',
  '#AA4643',
  '#89A54E',
  '#80699B',
  '#3D96AE',
  '#DB843D',
  '#92A8CD',
  '#A47D7C',
  '#B5CA92'
];


function agg_is(agg, type) {
  return agg.indexOf(type) != -1;
}

var col_re = /(.*)\((.*)\)/;
function extract_field(col) {
  var match = col_re.exec(col);
  if (match) {
    return match[2];
  }

  return col;
}

function extract_agg(col) {
  var match = col_re.exec(col);
  if (match) {
    return match[1].replace(/^\$/, "");
  }

  return "";
}

function fieldname(a,c) {
  if (a) {
    return a.replace(/^\$/, "") + "(" + c + ")";
  }

  // a hack to grab (count) -> count
  return c;
}

function get_col_aggs(dataset, parsed_query) {

  var cols = _.clone(parsed_query.cols);

  // custom aggs is a lookup from field_name -> [agg1, agg2, agg3]
  var custom_fields = parsed_query.custom_fields;

  var col_aggs = {};
  var agg = parsed_query.agg;
  _.each(cols, function(col) {

    var col_agg = agg + "(" + col + ")";
    col_aggs[col_agg] = col_agg;
  });

  _.each(custom_fields, function(em) {
    col_aggs[em] = em;
  });

  col_aggs = _.keys(col_aggs);
  return col_aggs;
}

var METADATA;
function set_metadata(md) {
  console.log("SETTING METADATA", md);
  METADATA = md;
}


function get_field_type(metadata, col) {
  // TODO: add final_types to metadata
  return METADATA.col_types[col];

}
function get_field_value(result, col) {
    var agg = extract_agg(col);
    var field = extract_field(col);

    var ret = null;
    var pos = [fieldname(agg, field), col, field];
    for (var c in pos) {
      if (result[pos[c]] !== null) {
        ret = result[pos[c]];
        break;
      }
    }

    return ret
}
function row_key(group_by, result) {
  var row = [];
  _.each(group_by, function(group) {
    row.push(result._id[group]);
  });


  return row.join(",");
}

function result_key(group_by, result) {
  var row = [];
  _.each(group_by, function(group) {
    row.push(result[group]);
  });


  return row.join(",");
}

// https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711#3561711
function escapeRegex(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}



function countToSize(count) {
    var sizes = ['', 'K', 'M', 'G', 'T', 'P', 'Z' ];
    if (count < 0) {
      return '-' + countToSize(-count);
    }

    if (count === 0) { return '0'; }
    if (!count || _.isNaN(count)) {
      return 'n/a';
    }

    var i = parseInt(Math.floor(Math.log(count) / Math.log(1000)), 10);

    if (_.isNaN(i)) {
      return 'n/a';
    }

    if (i >= sizes.length) {
      return count;
    } else if (i < 0) {
      return parseInt(count * 1000, 10) / 1000;
    }

    if (i < sizes.length - 1) {
      return Math.round(count / Math.pow(1000, i) * 100, 2) / 100 + '' + sizes[i];
    }

    return Math.round(count / Math.pow(1000, i) * 100, 2) / 100 ;
}

// from comments in http://codeaid.net/javascript/convert-size-in-bytes-to-human-readable-format-(javascript)
function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    if (bytes === 0) { return 'n/a'; }
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

module.exports = {
  formatters: {},
  inner_formatters: {},

  number_format: function number_format (number, decimals, dec_point, thousands_sep) {

    // http://kevin.vanzonneveld.net
    // +   original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +     bugfix by: Michael White (http://getsprink.com)
    // +     bugfix by: Benjamin Lupton
    // +     bugfix by: Allan Jensen (http://www.winternet.no)
    // +    revised by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
    // +     bugfix by: Howard Yeend
    // +    revised by: Luke Smith (http://lucassmith.name)
    // +     bugfix by: Diogo Resende
    // +     bugfix by: Rival
    // +      input by: Kheang Hok Chin (http://www.distantia.ca/)
    // +   improved by: davook
    // +   improved by: Brett Zamir (http://brett-zamir.me)
    // +      input by: Jay Klehr
    // +   improved by: Brett Zamir (http://brett-zamir.me)
    // +      input by: Amir Habibi (http://www.residence-mixte.com/)
    // +     bugfix by: Brett Zamir (http://brett-zamir.me)
    // +   improved by: Theriault
    // +      input by: Amirouche
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // *     example 1: number_format(1234.56);
    // *     returns 1: '1,235'
    // *     example 2: number_format(1234.56, 2, ',', ' ');
    // *     returns 2: '1 234,56'
    // *     example 3: number_format(1234.5678, 2, '.', '');
    // *     returns 3: '1234.57'
    // *     example 4: number_format(67, 2, ',', '.');
    // *     returns 4: '67,00'
    // *     example 5: number_format(1000);
    // *     returns 5: '1,000'
    // *     example 6: number_format(67.311, 2);
    // *     returns 6: '67.31'
    // *     example 7: number_format(1000.55, 1);
    // *     returns 7: '1,000.6'
    // *     example 8: number_format(67000, 5, ',', '.');
    // *     returns 8: '67.000,00000'
    // *     example 9: number_format(0.9, 0);
    // *     returns 9: '1'
    // *    example 10: number_format('1.20', 2);
    // *    returns 10: '1.20'
    // *    example 11: number_format('1.20', 4);
    // *    returns 11: '1.2000'
    // *    example 12: number_format('1.2000', 3);
    // *    returns 12: '1.200'
    // *    example 13: number_format('1 000,50', 2, '.', ' ');
    // *    returns 13: '100 050.00'
    // Strip all characters but numerical ones.
    number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
    var n = !isFinite(+number) ? 0 : +number,
      prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
      sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
      dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
      s = '',
      toFixedFix = function (n, prec) {
        var k = Math.pow(10, prec);
        return '' + Math.round(n * k) / k;
      };
    // Fix for IE parseFloat(0.55).toFixed(0) = 0;
    s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
    if (s[0].length > 3) {
      s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    if ((s[1] || '').length < prec) {
      s[1] = s[1] || '';
      s[1] += new Array(prec - s[1].length + 1).join('0');
    }
    return s.join(dec);
  },

  byte_format: bytesToSize,

  count_format: countToSize,
  set_fields: function(fields) {
    this.fields = fields;
  },

  // # {{{ TABLE POPOVER HELPERS
  get_wrapper_for_cell: function(el) {
    var $el = $(el);
    if (!$el.is("td")) {
      $el = $el.parents("td");
    }

    return $el;
  },
  get_field_type_for_cell: function(table, el) {
    var $td = this.get_wrapper_for_cell(el);
    var $th = $td.closest('table').find('th').eq($td.index());

    var col_name = $th.data('name');
    var col_type = get_field_type(table, col_name);

    return col_type;
  },
  get_field_name_for_cell: function(table, el) {
    var $td = this.get_wrapper_for_cell(el);
    var $th = $td.closest('table').find('th').eq($td.index());

    var col_name = $th.data('name');

    return col_name;
  },
  get_filter_for_popup: function(el) {
    // ugh, aunt and uncle datas?
    var wrapper = this.get_wrapper_for_cell(el).find(".cell_data");


    var op = el.attr("data-op");
    var name = wrapper.attr("data-name");
    var filter_type = wrapper.attr("data-type");
    var value = wrapper.attr("data-value");

    if (filter_type == "string") {
      value = escapeRegex(value);
    }

    return [name, op, value];

  },
  get_field_number_formatter: function(dataset, col) {
    col = extract_field(col);
    var self = this;
    var formatter = function(val) {
      if (self.inner_formatters[dataset]) {
        var inner_formatter = self.inner_formatters[dataset][col];

        if (inner_formatter) {
          return inner_formatter(val);
        }
      }
      return val;
    };

    return formatter;

  },

  get_field_formatter: function(dataset, col) {
    col = extract_field(col);
    if (!this.formatters[dataset])  {
      this.formatters[dataset] = {};
      this.inner_formatters[dataset] = {};
    }

    if (!this.formatters[dataset][col]) {

      var col_type = this.get_field_type(dataset, col);
      this.formatters[dataset][col] = function(val) {

        if (col_type === "integer" &&
            (typeof(val) === "string" || typeof(val) === "number")) {
          var formatted_value = module.exports.count_format(val);

          return $("<div >")
            .attr("data-value", val)
            .addClass("value_cell")
            .append(formatted_value);
        }

        return val;
      };
    }

    return this.formatters[dataset][col];
  },
  get_filter_for_cell: function(table, el) {
    var field_type = this.get_field_type_for_cell(table, el);
    var field_name = this.get_field_name_for_cell(table, el);
    var op = "$re";

    var value;
    if (el.find(".cell_data").length) {
      value = el.find(".cell_data").attr("data-value");
    } else {
      value = el.text();
    }

    if (field_type == "string") {
      value = escapeRegex(value);
    }

    return [field_name, op, value];
  },

  // # }}}
  build_table: function(dataset, headers, rows, column_config) {
    var self = this;
    // TODO: data formatting / munging goes on where?
    // How configurable is group by order?
    var table = $("<table class='table table-hover table-striped table-bordered'/>");
    var header = $("<thead>");
    var row = $("<tr />");
    var td;

    var col_formatters = [];
    var fields = this.fields;
    _.each(headers, function(col) {
      var field = extract_field(col) || col;
      var agg = extract_agg(col);
      td = $("<th>");
      var display_name = field;

      // the data-name is the underlying name of the column, not including
      // the aggregation
      td.attr('data-name', field);
      if (agg) {
        td.html(agg + "(" + display_name + ")");
      } else {
        td.html(display_name);
      }

      row.append(td);
      var f = self.get_field_formatter(dataset, field);
      col_formatters.push(f);
    });


    header.append(row);

    table.append(header);

    var tbody = $("<tbody>");

    _.each(rows, function(row) {
      // shadowing row above
      var rowEl = $("<tr />");

      _.each(row, function(col, index) {
        td = $("<td />");
        var col_formatter = col_formatters[index];

        if (col && col.indexOf && col.indexOf("->") != -1) {
          td.html(col);
        } else {
          td.html(col_formatter(col));
        }
        rowEl.append(td);
      });

      tbody.append(rowEl);
    });

    table.append(tbody);

    $C("tablesorter", { el: table }, function() {});

    return table;

  },

  get_rgba: function(name, opacity) {
    opacity = opacity || "0.5";
    var color = window.toRGB(this.get_color(name).substr(1));
    var color_str = "rgba(" + color.join(',') + ", " + opacity + ")";
    return color_str;
  },

  get_color: function(hash, palette) {
    if (!palette) {
      palette = COLORS;
    }

    if (!color_hashes[hash]) {
      if (!palette.__next_color) {
        palette.__next_color = 0;
      }

      palette.__next_color++;
      var next = palette.__next_color % palette.length;

      color_hashes[hash] = palette[next];
    }

    return color_hashes[hash];
  },

  humanize: function(str) {
    var tokens = str.split("_");
    return tokens.join(" ");
  },

  build_compare_cell: function(col_value, compare_value) {
    if (col_value === null || typeof col_value === "undefined") {
      return 'n/a';
    }

    var cell = $("<div>");
    var val_div = $("<div class='value_cell'>")
      .html(this.count_format(col_value));

    val_div.attr('data-value', col_value.toString());

    cell.append(val_div);

    if (typeof compare_value !== "undefined") {
      var comp_div = $("<div class='compare_cell'>")
        .html(this.count_format(compare_value));

      comp_div.attr('data-value', compare_value.toString());

      var delta_suffix = "%";
      var delta = parseInt((col_value - compare_value) / col_value * 10000, 10) / 100;

      var abs_delta = Math.abs(delta);
      var whichway = "grow";

      if (delta > 0) {
        whichway = "grow";
      } else {
        whichway = "shrink";
      }

      var delta_class;
      if (abs_delta > 100) {
        delta_class = "panic";
      } else if (abs_delta > 30) {
        delta_class = "oh_shit";
      }  else if (abs_delta > 15) {
        delta_class = "definitely";
      } else if (abs_delta > 10) {
        delta_class = "probably";
      } else if (abs_delta > 8) {
        delta_class = "sorta";
      } else if (abs_delta > 4) {
        delta_class = "kinda";
      } else if (abs_delta > 2) {
        delta_class = "maybe";
      } else {
        delta_class = "huh";
      }

      if (Math.abs(delta) > 1000) {
        delta = parseInt(delta, 10) / 100;
        delta_suffix = 'x';
      }

      var delta_div = $("<div class='delta'>").html("(" + delta + delta_suffix + ")");

      if (compare_value === 0) {
        whichway = "noway";
      }

      delta_div
        .addClass("per_" + whichway)
        .addClass(delta_class);

      val_div.prepend(delta_div);
      cell.append(comp_div);
    }

    return cell;
  },

  confirm_action: function(options, cb) {
    options.confirm = options.confirm || 'do it';
    var footerEl = $("<div />");
    var dismissButton = $('<button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>');
    var deleteButton = $('<button class="btn btn-primary really_drop">' + options.confirm + '</button> </div>');

    footerEl
      .append(dismissButton)
      .append(deleteButton);

    $C("modal", {
      title: options.title,
      body: options.body,
      footer: footerEl.html()
    }, function(cmp) {
      var reallyDropEl = cmp.$el.find(".really_drop");
      reallyDropEl.on("click", function() {
        cmp.hide();
        cb();
      });

      cmp.show();
    });


  },

  console: function() {
    console.log.apply(console, arguments);
  },


};
_.extend(module.exports, {
  VIEWS: {
    TIME: "time",
    TABLE: "table",
    HIST: "dist",
    DIST: "dist",
    SAMPLES: "samples"
  },
});


var FIELD_HELPERS = {
  row_key: row_key,
  result_key: result_key,
  fieldname: fieldname,
  extract_agg: extract_agg,
  extract_field: extract_field,
  agg_is: agg_is,
  get_col_aggs: get_col_aggs,
  get_field_value: get_field_value,
  get_field_type: get_field_type,
  set_metadata: set_metadata

};
_.extend(module.exports, FIELD_HELPERS);
