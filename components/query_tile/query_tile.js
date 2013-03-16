module.exports = {
  tagName: "div",
  className: "query_tile",
  defaults: {
    results: ""
  },
  client: function() {
    this.$el.find(".query_graph").hover(function() {
      $(this).find(".query_data").stop().animate({marginTop: "-40px" });
    }, function() {
      $(this).find(".query_data").stop().animate({marginTop: "0px" });
    });
  }
};
