"use strict";


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


function countToSize(count) {
    var sizes = ['', 'K', 'M', 'G', 'T', 'P', 'Z' ];
    if (count === 0) { return '0'; }
    var i = parseInt(Math.floor(Math.log(count) / Math.log(1000)), 10);

    return Math.round(count / Math.pow(1000, i) * 100, 2) / 100 + '' + sizes[i];
}

// from comments in http://codeaid.net/javascript/convert-size-in-bytes-to-human-readable-format-(javascript)
function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    if (bytes === 0) { return 'n/a'; }
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

module.exports = {

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

  build_table: function(headers, rows) {
    // TODO: data formatting / munging goes on where?
    // How configurable is group by order?
    var table = $("<table class='table table-hover table-striped table-bordered'/>");
    var header = $("<thead>");
    var row = $("<tr />");
    var td;

    _.each(headers, function(col) { 
      td = $("<th>");
      td.html(col);
      row.append(td);
    });

    header.append(row);

    table.append(header);

    var tbody = $("<tbody>");

    _.each(rows, function(row) {
      // shadowing row above
      var rowEl = $("<tr />");

      _.each(row, function(col) {
        td = $("<td />");
        td.html(col);
        rowEl.append(td);
      });

      tbody.append(rowEl);
    });

    table.append(tbody);

    $C("tablesorter", { el: table }, function() {});

    return table;

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
  build_compare_cell: function(col_value, compare_value) {
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
  }
};
