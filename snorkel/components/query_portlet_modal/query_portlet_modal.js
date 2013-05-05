'use strict';

module.exports = {
  tagName: "div",
  className: "",
  show: function() {
    this.$el.find(".modal").modal('show');
  },
  hide: function() {
    this.$el.find(".modal").modal('hide');
  },
  client: function() {
    var $el = this.$el;
    $el.find(".modal").modal();
    $(window.document.body).append(this.$el);

    if (this.options.dashboards) {
      var dashboards = _.object(this.options.dashboards, this.options.dashboards);
      $C("selector", { options: dashboards }, function(cmp) {
        cmp.$el.find("select").css('width', '206px');
        $el.find(".dashboard").append(cmp.$el);   
      });
    }
  }
};
