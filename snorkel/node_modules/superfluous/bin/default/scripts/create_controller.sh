#!/bin/bash

COMPONENT=$1

mkdir -p app/controllers/${COMPONENT}/

cat > app/controllers/${COMPONENT}/client.js << CLIENT
"use strict";

module.exports = {
  events: {

  },
  init: function() {

  }
};
CLIENT

cat > app/controllers/${COMPONENT}/server.js << SERVER
"use strict";

var controller = require_core("server/controller");
// Helpers for serialized form elements
var value_of = controller.value_of,
    array_of = controller.array_of;
    

module.exports = {
  routes: {
    "" : "index",
  },

  index: function(ctx, api) {
    var template_str = api.template.render("controllers/${COMPONENT}.html.erb");
    api.page.render({ content: template_str});
  },

  socket: function() {}
};
SERVER

mkdir -p app/static/templates/controllers/
cat > app/static/templates/controllers/${COMPONENT}.html.erb << TEMPLATE


<div class="container">
  <h1 class="col-md-8">Welcome to <b>${COMPONENT}</b>'s controller</h1>


  <div class="col-md-8">
    <%= render_partial("${COMPONENT}/index.html.erb") %>
  </div>
</div>

TEMPLATE

mkdir -p app/static/templates/partials/${COMPONENT}/ -p
cat > app/static/templates/partials/${COMPONENT}/index.html.erb << PARTIAL

<h2>This is a partial</h2>
It's your friend :-)

PARTIAL
