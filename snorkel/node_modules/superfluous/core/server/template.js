"use strict";

/**
 * This module deals with how templates are rendered and the functions exposed
 * to the rendering context. In general, controllers will render templates, while Components
 * have their template rendering handled for them, so this class is mostly
 * called into from the Server Controller of the currently running app.
 *
 * @class template (server)
 * @module Superfluous
 * @submodule Server
 */

var path = require("path");
var _ = require_vendor("underscore");
var context = require("./context");
var readfile = require("./readfile");
var hooks = require("./hooks");
var config = require_core('server/config');

context.setDefault("CSS_DEPS", {});
context.setDefault("JS_DEPS", {});

var load_template = function(template, options) {
  options = options || {};
  var root_path;
  if (options.core) {
    root_path = "core/static/templates/";
    return readfile.core(root_path + template);
  } else {
    root_path = "templates/";
    return readfile.all(root_path + template);
  }
};

function add_stylesheet(name) {
  context("CSS_DEPS")[name] = true;
}

function add_js(name) {
  context("JS_DEPS")[name] = true;
}

// TODO: delete this? or use it?
function render_css_link(stylesheet) {
  var root_path = "styles/"
  return render_core_template("helpers/css_link.html.erb", {
    path: root_path + stylesheet
  });

}

function render_js_link(script) {
  var root_path = "scripts/";
  return render_core_template("helpers/js_link.html.erb", {
    path: root_path + script,
  });
}

function setup_render_context(options) {
  var ret = {};
  hooks.invoke("setup_template_context", ret, function() {
    _.extend(ret, options, {
      add_stylesheet: add_stylesheet,
      add_javascript: add_js,
      ctx: context.get(),
      url_for: _.bind(context("router").build, context("router")),
      add_socket: add_socket,
      render_template: render_template,
      render_partial: render_partial,
      render_core: render_core_template,
      set_default: function(key, value) {
        if (typeof this[key] === "undefined") {
          this[key] = value;
        }
      }
   });
  });

  return ret;
}

var render_core_template = function(template, options) {
  return render_template(template, options, true);
};

var _compiled_templates = {};

var render_template = function(template, options, core) {
  var template_data = load_template(template, { core: core });
  var ret;

  function after_render(data) {
    ret = data;
  }



  if (!options) {   
    options = {};
  }

  options = setup_render_context(options);

  if (!core) {
    hooks.call("render_template", template, template_data, options, after_render,
      function(template, template_data, options, done) {
        done(_render_template(template, template_data, options, core));
      });
  } else {
    ret = _render_template(template, template_data, options, core);
  }

  return ret;
};

var _render_template = function(template, template_data, options, core) {
  var template_key = template + ":" + (core ? "core" : " app");

  var templateSettings = {};
  // When in production, we cache templates from server start to server start
  if (!_compiled_templates[template_key] || !config.RELEASE) {
    try {
      _compiled_templates[template_key] = _.template(template_data);
    } catch(e) {
      console.log("Error compiling template", template, e);
    }

  }

  var template_exec = _compiled_templates[template_key];

  var template_str = "";
  try {
    template_str = template_exec(options, templateSettings);
  } catch (ee) {
    var error_msg = "Error executing template " + template + ": '" + ee + "'";
    console.log(error_msg);
    return error_msg;
  }

  return template_str;
};

var render_partial = function(template, options) {
  return render_template("partials/" + template, options);
};

var socket_header = function(prelude_hash) {

  if (prelude_hash) {
    var ret = render_core_template("helpers/js_link.html.erb", {
      path: "/pkg/socket",
      hash: prelude_hash
    });

    if (!context("added_socket")) {
      ret += add_socket();
    }


    return ret;
  }
};

var js_header = function(prelude_hash) {
  var ret = "";
  ret += render_core_template("helpers/js_link.html.erb", {
    path: "/pkg/prelude.js",
    hash: prelude_hash
  });
  return ret;
};

var css_header = function(prelude_hash) {
  var ret = "";
  ret += render_core_template("helpers/css_link.html.erb", {
    path: "/pkg/prelude.css",
    hash: prelude_hash
  });

  return ret;
};

var add_socket = function(socket) {
  if (!socket) {
    context("added_socket", true);
  }

  return render_core_template("helpers/socket.io.html.erb", {
    name: (socket || context("controller")),
    host: context("req").headers.host
  });
};

module.exports = {
  load: load_template,
  /**
   * Renders a template into a string
   *
   * @method render
   */
  render: render_template,
  render_core: render_core_template,
  /**
   * Renders a partial into a string
   *
   * @method partial
   *
   */
  partial: render_partial,
  /**
   * Adds a stylesheet to load before inserting the current template
   *
   * @method add_stylesheet
   */
  add_stylesheet: add_stylesheet,
  add_js: add_js,
  // redundancy ahoy
  add_javascript: add_js,
  js_header: js_header,
  css_header: css_header,
  socket_header: socket_header,
  setup_context: setup_render_context
};
