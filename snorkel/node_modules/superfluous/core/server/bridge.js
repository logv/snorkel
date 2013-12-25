/**
 * The Bridge is responsible for communication between the client and server
 * during app delivery. The bridge flushes payloads and instructions to the
 * client delivery engine, which downloads the payload dependencies before
 * inserting the payload into the page.
 *
 * The bridge can be used by the Server Controller to load dependencies or make
 * explicit calls into client side JS modules.
 *
 * @class bridge (server)
 * @module Superfluous
 * @submodule Server
 **/

"use strict";
var context = require("./context");
var template = require("./template");
var readfile = require_core("server/readfile");
var quick_hash = require_core("server/hash");


context.setDefault("BRIDGE_CALLS", []);

var __id = 0;
var _ = require_vendor("underscore");

var _marshalls = {
};

function add_marshaller(name, func) {
  _marshalls[name] = func;
}

function marshall_args() {
  var args = _.toArray(arguments);
  _.each(args, function(arg, index) {
    _.each(_marshalls, function(marshaller) {
      var marshalled = marshaller(args[index]);
      if (marshalled) {
        args[index] = marshalled;
      }
    });
  });

  return args;
}

module.exports = {
  /**
   * Invokes a function in a client JS module.
   * 
   * @method call
   * @param {String} module_name the module name to load. This should be a full
   * path from the app root (app/client/some_module, f.e.)
   * @param {String} function_name function name to call. This should be exposed in the module.exports of the module being loaded.
   * @param {Mixed} args* the arguments to pass the invoked function. Any
   * Components passed in will be properly marshalled to the client and
   * instantiated before calling this function.
   */
  call: function() {
    var args = marshall_args.apply(null, arguments);
    var module = args.shift();
    var func = args.shift();

    var hash = quick_hash(readfile.both(module + ".js"));

    context("BRIDGE_CALLS").push([module, func, args, hash]);
  },

  /**
   *
   * Injects raw JS into the page.
   * Generally, this is used internally and not for external consumption.
   *
   * @method raw
   * @params {String} javascript_code the javacsript code to insert into this page.
   */
  raw: function(str) {
    context("stream").write("<script>" + str + " </script>");
  },

  /**
   *
   * Invokes a function on a controller. This is useful for passing state to
   * the client controller during the initial page delivery.
   *
   *
   * @method controller
   * @param {String} controller_name the controller name (as just the module_name, not a complete path) to invoke the function on.
   * @param {String} function_name the function to call on the controller.
   * @param {Mixed} args* any arguments to use when invoking the controller.
   * Any Components used will be automatically marshalled before invoking this
   * function on the client.
   */
  controller: function() {
    var args = marshall_args.apply(null, arguments);

    var data = readfile("app/controllers/" + args[0] + "/client.js");
    var hash = quick_hash(data);
    args.push(hash);

    var chash = quick_hash(readfile.core("core/client/controller.js"));


    context("BRIDGE_CALLS").push(["core/client/controller", "call", args, chash]);
  },

  flush_data: function(data, id, cb) {
    var res = context("stream");

    if (!res) {
      throw "NO RESPONSE AVAILABLE FOR REQUEST";
    }

    id = id || ("bridge" + __id++);


    // we strip extensions off CSS_DEPENDENCIES, because the bootloader knows
    // they are .css already
    var css_deps = _.map(context("CSS_DEPS"),
        function(val, dependency) { return dependency.replace(/\.css$/, ''); });

    var options = {
      js: context("JS_DEPS"),
      css: css_deps,
      tmpl: [],
      cmp: [],
      id: id
    };

    context.reset("JS_DEPS");
    context.reset("CSS_DEPS");

    data = data || "";
    var data_tmpl = template.render_core("helpers/bridge_payload_content.html.erb", {
      payload: data.replace(/<!--(.*?)-->/, ''),
      payload_id: id
    });

    // build a payload for this data packet and flush it
    var tmpl = template.render_core("helpers/bridge_payload.html.erb", {
      json_data: JSON.stringify(options)
    });


    res.write("<div data-bridge-id='delivery'>");
    res.write(data_tmpl);
    res.write(tmpl);
    res.write(this.render());
    res.write("</div>");

    if (cb) {
      cb();
    }
  },

  /**
   *
   * Renders any queued up bridge invocations as a string to deliver to the client.
   * This is used by core/server/page when generating the page
   *
   * @method render
   * @private
   * @return {String} The raw HTML for the bridge invocations to be run on the client.
   */
  render: function() {
    // render and replace
    var bridge_calls = context("BRIDGE_CALLS");
    context.reset("BRIDGE_CALLS");

    var ret = "";
    _.each(bridge_calls, function(call) {
      ret += "\n" + template.render_core("helpers/bridge_call.html.erb", {
        json_data: JSON.stringify({
          module: call[0],
          func: call[1],
          args: call[2],
          hash: call[3]})
      });

    });

    return ret;
  },

  /**
   * Adds a function for marshalling components across boundaries
   *
   */
  add_marshaller: add_marshaller,

  /**
   * Marshalls a serious of arguments
   *
   */
  marshall_args: marshall_args
};
