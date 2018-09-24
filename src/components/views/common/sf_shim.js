module.exports = {
  add_old_params: function(parsed) {
    if (!parsed) {
      return;
    }
    parsed.dims = parsed["groupby[]"]
    parsed.cols = parsed["fields[]"] || [];
    parsed.col = parsed["field"] || parsed.cols[0] || null;
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
  }
};
