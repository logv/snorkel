module.exports = {
  events: {
    "click": "go_clicked"
  },

  "go_clicked": function() {
    // TODO: accessing this data should be cleaner
    jank.sync("kitten", jank.get("kitten"));
  }
}
