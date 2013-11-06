var fs = require("fs");
var _ = require_vendor("underscore");
var context = require("./context");
var readfile = require("./readfile");

context.setDefault("CSS_DEPS", {});
context.setDefault("JS_DEPS", {});

var load_core_template = function(template) {
  return load_template(template, true);
};

var load_template = function(template, core) {
  var root_path;
  if (core) {
    root_path = "core/static/templates/";
  } else {
    root_path = "app/static/templates/";
  }

  return readfile(root_path + template);

};

function add_stylesheet(name) {
  context("CSS_DEPS")[name] = true;
}

function add_js(name) {
  context("JS_DEPS")[name] = true;
}

function render_css_link(stylesheet) {
  var root_path = "styles/"
  return render_core_template("helpers/css_link.html.erb", {
    path: root_path + stylesheet
  });

}

function render_js_link(script) {
  var root_path = "scripts/"
  return render_core_template("helpers/js_link.html.erb", {
    path: root_path + script,
  });
}

var render_layout = function(layout, options) {
  // similar to render template?
}

var render_controller_template = function(template, options) {
  return render_template("controllers/" + template, options);
}

function setup_render_context(options) {
  return _.extend(options, {
    add_stylesheet: add_stylesheet,
    add_javascript: add_js,
    add_socket: add_socket,
    render_template: render_template,
    render_partial: render_partial,
    set_default: function(key, value) {
      if (typeof this[key] === "undefined") {
        this[key] = value;
      }
    }
  });
}

var render_core_template = function(template, options) {
  return render_template(template, options, true);
}

var render_template = function(template, options, core) {
  var template_data = load_template(template, core);

  if (!options) {
    options = {};
  }


  options = setup_render_context(options);

  // TODO: this should be more extensible than just adding a user
  var user = context("req").user;
  options.username = (user && user.username) || "";
  options.loggedin = !!user;

  var template_str = _.template(template_data, options);

  return template_str;
};

var render_partial = function(template, options) {
  return render_template("partials/" + template, options);
}

var js_header = function() {
  var ret = "";
  _.forEach(context("JS_DEPS"), function(v, k) {
      ret += render_js_link(k) + "\n";
  });

  ret += render_core_template("helpers/js_link.html.erb", {
    path: "/pkg/prelude.js"
  });

  return ret;
};

var css_header = function() {
  var ret = "";
  ret += render_core_template("helpers/css_link.html.erb", {
    path: "/pkg/prelude.css"
  });

  return ret;
};

var add_socket = function(socket) {
  return render_core_template("helpers/socket.io.html.erb", {
    name: (socket || context("controller")),
    host: context("req").headers.host
  });
}

module.exports = {
  load: load_template,
  load_core: load_core_template,
  render: render_template,
  render_core: render_core_template,
  partial: render_partial,
  controller: render_controller_template,
  add_stylesheet: add_stylesheet,
  add_js: add_js,
  add_socket: add_socket,
  js_header: js_header,
  css_header: css_header,
  setup_context: setup_render_context
};
