module.exports = { 
  events: {
    "click" :  "handle_template_click"
  },

  handle_template_click: function() {
    // open a modal dialog with this image?
    // replace main image with this one?
    var kitten = this.options.name % 18;

    // stores a per controller piece of data on the server that is shared with
    // everyone else.
    jank.set("kitten", kitten);

  }
};
