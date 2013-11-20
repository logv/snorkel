#!/bin/bash

COMPONENT=$1

mkdir -p app/controllers/${COMPONENT}/

cat > app/controllers/${COMPONENT}/client.js << CLIENT
"use strict";

module.exports = {
  click_handler_uno: function() {
    console.log("Handling a click");
  },
  init: function() {

  }
};
CLIENT

cat > app/controllers/${COMPONENT}/server.js << SERVER
"use strict";

var controller = require_core("server/controller");
var page = require_core("server/page");
var template = require_core("server/template");

// Helpers for serialized form elements
var value_of = controller.value_of,
    array_of = controller.array_of;
    

module.exports = {
  routes: {
    "" : "index",
  },

  index: function() {
    var template_str = template.render("controllers/${COMPONENT}.html.erb");
    page.render({ content: template_str});
  },

  socket: function() {}
};
SERVER

mkdir -p app/static/templates/controllers/
cat > app/static/templates/controllers/${COMPONENT}.html.erb << TEMPLATE


<h1>Welcome to <b>${COMPONENT}</b>'s controller</h1>

This is where the magic happens. (also, remember to change this part)

<%= render_partial("${COMPONENT}/index.html.erb") %>

TEMPLATE

mkdir -p app/static/templates/partials/${COMPONENT}/ -p
cat > app/static/templates/partials/${COMPONENT}/index.html.erb << PARTIAL

<div class="container-fluid">
  <h2>This is a partial</h2>
  It's your friend :-)
</div>

PARTIAL
