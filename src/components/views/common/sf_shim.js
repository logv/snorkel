var $ = $require("jquery");
var helpers = require("common/sf_helpers.js");

module.exports = {
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

    parsed.custom_fields = []

  },
  initialize: function(ctx) {

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
  prepare_and_render: function(view, ctx) {
    var parsed = ctx.query;
    module.exports.add_old_params(parsed);
    ctx.parsed = parsed;

    view.metadata = ctx.metadata;
    view.query = parsed;
    view.parsed = parsed;
    helpers.set_metadata(ctx.metadata);

    view.data = ctx;
    view.data = view.prepare(ctx);
    console.log("VIEW DATA", view.data);

    view.finalize();
    view.render();

  }
};
