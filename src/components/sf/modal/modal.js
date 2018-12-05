module.exports = {
  tagName: "div",
  className: "",
  defaults: {
    content: "default content"
  },
  show: function() {
    this.$el.show().find(".modal").show().modal('show');
  },
  hide: function() {
    this.$el.hide().find(".modal").hide().modal('hide');
  },
  client: function() {
    var $el = this.$el;
    this.$el.find(".modal").modal();
    this.$el.find(".modal").on('hidden.bs.modal', function () {
      console.log("HIDING EL", $el);
      $el.hide();
    });

    $(document.body).append(this.$el);
  }
};
