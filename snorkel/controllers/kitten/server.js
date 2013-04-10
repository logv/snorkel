var template = require_root("server/template");
var page = require_root("server/page");
var context = require_root("server/context");
var bridge = require_root("server/bridge");
var Component = require_root("server/component");
var auth = require_root("server/auth");

var db = require_root("server/db");

// TODO: if this is a single page app, streamline the process of rendering the
// template, fetching data and hooking up views into a simpler idea
function index() {
  var async_button = function(options) {
      var button = $C("button", options);
      return page.async(function(flush) {
        _.delay(function() {
          flush(button.toString());
        }, (Math.random() * 1000) + 1000);
    });
  };

  template.add_stylesheet("scrollers.css");

  context("title", "kittyBrowser");

  var logout_button = $C("button", {
      name: "log out",
      class: "btn-small",
      delegate: {
        "click" : "handle_logout"
      }
    });

  var render_sidebar = function() {
    return template.partial("kitten/sidebar.html.erb", {
      sidebar_notice: page.async(function(flush) {
        _.delay(function() {
          flush("<div class='alert'>here it is. this is where sidebar details could show up.</div>");
        }, 3000);
      })
    });
  }

  var user = context("req").user;
  var username;
  if (user) {
    username = user.username;
  }

  var template_str = template.controller("kitten.html.erb", {
    render_button1: async_button({ name: "Sync", behavior: "kitten/go_button"}),
    render_button2: async_button({ name: "Reset", behavior: "kitten/reset_button"}),
    render_sidebar: render_sidebar,
    username: username,
    render_logout_button: logout_button.toString
  });

  page.render({content: template_str});
};

var __id = 0;
__id++;

var __nid = 0;

module.exports = {
  index: index, // should be wrapped in auth.require_user
  routes: {
    "": "index"
  },

  realtime: function(io) {
    setInterval(function() {
      io.emit("kitten", {
        id: Math.round(Math.random() * 10000),
        active: Date.now()
      });

    }, (Math.random() * 10000) + 3000);
  },

  socket: function(socket) {
    var id = __id++;

    socket.emit("init", {
      // means that server just learned about this socket
      id: id
    });

    socket.emit("kitten", {
      id: id,
      active: Date.now()
    });
  }
}
