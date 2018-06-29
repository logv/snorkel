module.exports = {
  tagName: "div",
  className: "",
  // TODO: client and server initializers
  initialize: function(options) {

  },
  client: function() {

  },
  set_controller: function(controller) {
    this.controller = controller;
    return this;
  },
  get_controller: function(controller) {
    return this.controller;
  }
};
