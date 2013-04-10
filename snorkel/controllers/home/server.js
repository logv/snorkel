"use strict";

var template = require_root("server/template");
var page = require_root("server/page");
var context = require_root("server/context");
var Component = require_root("server/component");
var auth = require_root("server/auth");

function index() {
  // TODO: automate this, so its unecessary
  // override the name of this controller from "" => home
  context("controller", "home");
  context("title", "welcoem");


  var template_str = template.render("controllers/home.html.erb", {});

  page.render({ content: template_str });
}

module.exports = {
  index: index,

  routes: {
    "" : "index"
  }
};
