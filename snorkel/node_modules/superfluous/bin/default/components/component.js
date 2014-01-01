// Assume underscore and Backbone are already defined
var Component = Backbone.View.extend({
  tagName: 'div',

  className: 'cmp',

  init: function(options) {
    Backbone.View.init(options);
    this.__id = options.id;
  },

  dispose: function() {

  },

  appendTo: function(parent) {
    return this.$el.appendTo(parent);
  },

  prependTo: function(parent) {
    return this.$el.prependTo(parent);
  },

  append: function(content) {
    return this.$el.append(content);
  },

  prepend: function() {
    return this.$el.prepend(content);
  },

  parent: function(selector) {
    return this.$el.parent(selector);
  },

  html: function(content) {
    return this.$el.html(content);
  },

  render: function() {
    var modeled = this.$el.find("[data-model]");

    _.each(modeled, function(el) {
      var par = Backbone.$(el).parent("[data-cmp]");
    });
    // TODO: Fill these out with modeled values on updates
  },

  toString: function() {
    // yuck
    var outer = Backbone.$("<div />");
    outer.append(this.$el.clone());

    var out_html = outer.html();
    return out_html;
  }
});

module.exports = Component;
