"use strict";

module.exports = { 
  // Component event handling goes here
  // This is purposefully kept separate from
  // the main component file, since it has code
  // that is generally not relevant to the server.
  events: {
    "click" :  "handle_template_click"
  },

  handle_template_click: function() {
    console.log(this.id, "clicked");
  }
};
