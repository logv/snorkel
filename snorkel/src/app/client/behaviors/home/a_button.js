module.exports = {
  events: {
    "click" : "sample_click"
  },

  sample_click: function() {
    $("#clickit")
      .html("nice job :)")
      .fadeIn();
  }
}
