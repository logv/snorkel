"use strict";

var template = require_core("server/template");
var page = require_core("server/page");
var context = require_core("server/context");
var Component = require_core("server/component");
var auth = require_core("server/auth");

function index() {
  // TODO: automate this, so its unecessary
  // override the name of this controller from "" => home
  context("controller", "home");

  template.add_stylesheet("home.css");


  var header_str = template.render("helpers/header.html.erb", { show_user_status: true });

  if (context('req').isAuthenticated()) { 
    context('res').redirect('/datasets');
  } else {
    var template_str = template.render("controllers/home.html.erb", {});

    page.render({ content: template_str, header: header_str });
  }
}

module.exports = {
  index: index,

  routes: {
    "" : "index"
  }
};
