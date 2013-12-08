"use strict";

var template = require("./template");
var context = require("./context");
var bridge = require("./bridge");
var component = require("./component");
var EventEmitter = require('events').EventEmitter;
var quick_hash = require_core("server/hash");
var readfile = require_core("server/readfile");
var bootloader_controller = require_core("controllers/bootloader/server");
var async = require("async");

var cheerio = require("cheerio");


var __async_id = 0;
context.setDefault("ASYNC_FUTURES", []);

// This function will also contain logic for rendering async pages
var render_async = function(func) {
  var div = cheerio("<div class='async'/>");
  var futures = context("ASYNC_FUTURES");
  var res = context("res");
  var id = "async" + __async_id;
  __async_id += 1;

  return function() {
    div.attr("id", id);
    var future_func = function(cb) {
      func(function(data) {
        try {
          bridge.flush_data(data, id, cb);
        } catch(e) {
          console.error(e);
        }
      });
    };

    futures.push(future_func);

    return div;
  };
};

function resolve_futures() {
  // FUTURES ARE ASYNC, NEED TO USE context() HERE
  // Execute all future funcs, now
  var futures = context("ASYNC_FUTURES");

  context("ASYNC_FUTURES", []);

  var async_start = Date.now();

  var pending = futures.length;
  function resolution() {
    try {
      var now = Date.now();
      var elapsed = now - context("__start");
      var async_elapsed = now - async_start;
      debug("Ending futures for ", context("id"), ", request duration:",
        elapsed, "async duration: ", async_elapsed);

      // What happens if someone enqueues futures during a future? (this is
      // what happens...)
      futures = context("ASYNC_FUTURES");
      if (futures.length) {
        resolve_futures();
      } else {
        module.exports.emit("async");
        module.exports.emit("finished");
        context("stream").end();
      }
    } catch(e) {
      console.error(e);
    }
  }

  function resolve_pending() {
    pending -= 1;

    if (!pending) {
      resolution();
    }
  }

  if (!pending) {
    resolution();
  } else {
    _.each(futures, function(future) {
      future(resolve_pending);
    });
  }
}


var render_page = function(page_options) {
  var $$ = context.get();

  // any dependencies after this will have to be bootloaded in
  var sidebar_content = "";
  var controller = $$.controller;

  // strip controller slashes (just in case)
  controller = controller.replace(/^\/*/, '');

  // render into page format
  var hash = quick_hash(readfile("app/controllers/" + controller + "/client.js"));
  var css_hash, js_hash, socket_hash;

  async.parallel([function(after) {
    bootloader_controller.get_css_prelude_hash(function(hash) {
      css_hash = hash;
      after();
    });
  }, function(after) {
    bootloader_controller.get_js_prelude_hash(function(hash) {
      js_hash = hash;
      after();
    });
  }, function(after) {
    bootloader_controller.get_socket_hash(function(hash) {
      socket_hash = hash;
      after();
    });
  }], 
  function () { // after everything finishes
    var use_socket = page_options.socket || context("added_socket");
    var page = component.build("page", {
      header: page_options.header,
      sidebar: sidebar_content,
      controller: controller,
      hash: hash,
      socket_header: use_socket && template.socket_header(socket_hash),
      title: $$.title || "SF",
      id: context("id"),
      js_header: template.js_header(js_hash), // TODO: make this the dynamic list of modules to load
      css_header: template.css_header(css_hash) // TODO: make this the packaged CSS early dependency file
      });

      var pagePrefix = "<!DOCTYPE html>\n";
      var pageStr = pagePrefix + page.toString();

      // TODO: work on how the order of things are initialized happens
      try {
        $$.res.setHeader('Content-Type', 'text/html');
        $$.res.setHeader('Content-Encoding', 'gzip');
        $$.stream.write(pageStr);

        // Update the name of the controller on the page, when we can.
        // This also sets the $page element on the controller, inevitably
        bridge.call("core/client/controller", "set", controller, page.id, hash);

        bridge.flush_data(page_options.content, "page_content");

        $$.stream.write(bridge.render());
        $$.stream.flush();
      } catch(e) {
        console.error(e);
        return;
      }

      resolve_futures();

  });
};

var emitter = new EventEmitter();
module.exports = _.extend(emitter, { render: render_page, async: render_async});
