"use strict";

module.exports = {
  routes: {
    "" : "index"
  },

  index: function(ctx, api) {
    var template_str = api.template.render("controllers/home.html.erb");
    api.page.render({ content: template_str});
  },

  socket: function() {}
};
