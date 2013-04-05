module.exports = {
  tagName: "div",
  className: "",
  defaults: {
    content: "default content"
  },
  client: function() {
  },
  getTab: function(tabName) {
    return this.$el.find("#tab_" + tabName);
  }
};
