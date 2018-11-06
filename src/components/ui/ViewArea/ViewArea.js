module.exports = {
  set_view: function(view) {
    this.set_query_details(view.options);
  },
  set_query_details: function(view) {
    console.log("QUERY DETAILS", view);
    var options = { results: view.results, query: view.query,
      parsed: view.parsed, created: view.created * 1000 };
    var $el = this.$el;
    $C("query_details", {query: options, created: view.created*1000 }, function(cmp) {
      console.log("QUERY DETAILS COMP", cmp);
      $el.prepend(cmp.$el);
    });
  }

}
