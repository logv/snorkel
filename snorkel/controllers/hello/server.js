var page = require_root("server/page");
var template = require_root("server/template");
var auth = require_root("server/auth");

module.exports = {
  routes: {
    "" : "index",
  },

  index: auth.require_user(function() {
    var template_str = template.render("controllers/hello.html.erb");
    page.render({ content: template_str});
  }),

  realtime: function() {},
  socket: function() {}
};
