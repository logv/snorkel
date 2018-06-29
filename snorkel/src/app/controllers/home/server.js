"use strict";

var template = require_core("server/template");
var page = require_core("server/page");
var context = require_core("server/context");
var Component = require_core("server/component");
var auth = require_core("server/auth");
var config = require_core("server/config");

function index(ctx, api) {
  template.add_stylesheet("home.css");


  var header_str = template.render("helpers/header.html.erb", { show_user_status: true });

  if (context('req').isAuthenticated()) {
    context('res').redirect('/datasets');
  } else {
    if (config.show_tour) {
      var template_str = template.render("controllers/home.html.erb", {});

      page.render({ content: template_str, header: header_str });
    } else {
      ctx.res.redirect("/datasets");
    }
  }
}

module.exports = {
  index: index,

  routes: {
    "" : "index"
  }
};
