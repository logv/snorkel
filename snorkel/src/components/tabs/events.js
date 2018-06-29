module.exports = { 
  events: {
    "click" :  "handle_template_click"
  },

  handle_template_click: function() {
    console.log(this.id, "clicked");
  }
};
