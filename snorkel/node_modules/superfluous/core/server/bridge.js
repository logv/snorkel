"use strict";

var context = require("./context");
var template = require("./template");
var readfile = require_core("server/readfile");
var quick_hash = require_core("server/hash");


context.setDefault("BRIDGE_CALLS", []);

var __id = 0;
var _ = require_vendor("underscore");

function marshall_args() {
  var args = _.toArray(arguments);
  _.each(args, function(arg, index) {
    if (arg.isComponent) {
      args[index] = { id: arg.id, isComponent: true };
    }
  });

  return args;
}
module.exports = {
  // @params:
  //
  // module
  // func
  // args
  call: function() {
    var args = marshall_args.apply(null, arguments);
    var module = args.shift();
    var func = args.shift();

    var hash = quick_hash(readfile.both(module + ".js"));

    context("BRIDGE_CALLS").push([module, func, args, hash]);
  },

  raw: function(str) {
    context("stream").write("<script>" + str + " </script>");
  },

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
      return;
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


    res.write(data_tmpl);
    res.write(tmpl);
    res.write(this.render());

    if (cb) {
      cb();
    }
  },

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
  }
};
