#!/bin/bash

COMPONENT=$1

mkdir controllers/${COMPONENT}/

cat > controllers/${COMPONENT}/client.js << CLIENT
module.exports = {
  click_handler_uno: function() {
    console.log("Handling a click");
  }
};
CLIENT

cat > controllers/${COMPONENT}/server.js << SERVER
var page = require_root("server/page");
var template = require_root("server/template");

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

mkdir -p static/templates/controllers/
cat > static/templates/controllers/${COMPONENT}.html.erb << TEMPLATE


<h1>Welcome to <b>${COMPONENT}</b>'s controller</h1>

This is where the magic happens. (also, remember to change this part)

<%= render_partial("${COMPONENT}/index.html.erb") %>

TEMPLATE

mkdir -p static/templates/partials/${COMPONENT}/ -p
cat > static/templates/partials/${COMPONENT}/index.html.erb << PARTIAL

<div class="container-fluid">
  <h2>This is a partial</h2>
  It's your friend :-)
</div>

PARTIAL
