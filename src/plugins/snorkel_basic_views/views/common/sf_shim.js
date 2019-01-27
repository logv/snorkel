var $ = $require("jquery");
var helpers = require("common/sf_helpers.js");
var filters = require("common/filters.js");

module.exports = {
  initialize: function(ctx) {
    helpers.set_metadata(ctx.metadata);
    this.graph_component = "nvd3";
    var parsed = ctx.query;
    parsed.custom = parsed.custom || {};

    this.metadata = ctx.metadata;
    module.exports.add_old_params(parsed);
    console.log("CTX", ctx);

    var rows;
    if (this.marshall_rows) { rows = this.marshall_rows(parsed, ctx.results);
    } else { rows = ctx.results; }

    this.query = { results: rows, parsed: parsed};
    this.data = this.prepare(this.query);
    console.log("THIS DATA", this.data);

    this.render();

  },
  add_old_params: function(parsed) {
    if (!parsed) {
      return;
    }
    parsed.dims = parsed["groupby[]"] || [];
    parsed.cols = parsed["fields[]"] || [];
    if (parsed["field"]) {
      parsed.cols = [ parsed["field"] ]
    }
    parsed.col = parsed.cols[0] || null;
    parsed.agg = "$" + (parsed["metric"] || "count").toLowerCase();

    if (parsed.cols.length == 0 && parsed.agg == "$avg") {
      parsed.agg = "$count";
    }

    parsed.custom_fields = parsed["custom_fields[]"] || [];

  },
  prepare_and_render: function(view, ctx) {
    var parsed = ctx.query;
    module.exports.add_old_params(parsed);
    ctx.parsed = parsed;
    view.query = ctx;
    view.graph_component = "nvd3";

    view.metadata = ctx.metadata;
    view.parsed = parsed;
    helpers.set_metadata(ctx.metadata);

    view.data = ctx;
    view.data = view.prepare(ctx);

    var compare_ctx = _.clone(ctx);
    compare_ctx.results = ctx.compare;
    view.compare_query = compare_ctx;
    if (!_.isEmpty(ctx.compare)) {
      view.compare_data = view.prepare(compare_ctx);
    }

    console.log("VIEW DATA", view.data);
    console.log("COMPARE DATA", view.compare_data);

    view.finalize();
    view.render();

  }
};
