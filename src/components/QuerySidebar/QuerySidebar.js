module.exports = {
  initialize: function() {
  },
  events: {
    "change .selector[name='view']" : "handle_view_changed"

  },
  handle_view_changed: function() {
    console.log("VIEW CHANGED");

  }

}
