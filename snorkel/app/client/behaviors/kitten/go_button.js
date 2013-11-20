module.exports = {
  events: {
    "click": "go_clicked"
  },

  "go_clicked": function() {
    // TODO: accessing this data should be cleaner
    SF.sync("kitten", SF.get("kitten"));
  }
}
