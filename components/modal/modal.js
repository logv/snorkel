module.exports = {
  tagName: "div",
  className: "",
  defaults: {
    content: "default content"
  },
  show: function() {
    this.$el.find(".modal").modal('show');
  },
  hide: function() {
    this.$el.find(".modal").modal('hide');
  },
  client: function() {
    this.$el.find(".modal").modal();
    $(document.body).append(this.$el);
  }
};
