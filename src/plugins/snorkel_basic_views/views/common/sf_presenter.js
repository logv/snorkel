
module.exports = {
  get_field_name: function(dataset, col) {
    return col;
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
          var formatted_value = helpers.count_format(val);

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
}
