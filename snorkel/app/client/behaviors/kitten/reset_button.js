module.exports = {
  events: {
    "click": "reset_clicked"
  },

  "reset_clicked": function() {
    $("#kitten_list").empty();
  }
}
