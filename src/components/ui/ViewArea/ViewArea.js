module.exports = {
  no_results: function(err) {
    var el = this.$el;
    console.log(err);

    this.$el.empty();

    var errorEl = $("<div class='clearfix' style='vertical-align: bottom'>");
    errorEl.append($("<img src='/static/images/no-diving.png' style='height: 60%'>"));
    errorEl.append($("<h1 class='span2'>Doh.</h1>"));
    errorEl.append($("<div class='clearfix' />"));
    errorEl.append($("<hr />"));
    errorEl.append($("<h2 class='span12'>").html(err.name));
    errorEl.append($("<h3 class='span12'>").html(err.errmsg));

    this.$el.append(errorEl);


  },
  set_view: function(view) {
    this.set_query_details(view.options);
  },
  set_query_details: function(view) {
    var options = { results: view.results, query: view.query,
      parsed: view.query, created: view.created * 1000 };
    var $el = this.$el;
    $C("query_details", {query: options, created: view.created*1000 }, function(cmp) {
      $el.prepend(cmp.$el);
    });
  }

}
