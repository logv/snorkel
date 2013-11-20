"use strict";

var template = require("./template");
var context = require("./context");
var bridge = require("./bridge");
var component = require("./component");
var EventEmitter = require('events').EventEmitter;

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
        context("res").end();
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
  var page = component.build("page", {
    header: page_options.header,
    sidebar: sidebar_content,
    controller: controller,
    socket: page_options.socket,
    title: $$.title || "SF",
    id: context("id"),
    js_header: template.js_header(), // TODO: make this the dynamic list of modules to load
    css_header: template.css_header() // TODO: make this the packaged CSS early dependency file
    });

  var pagePrefix = "<!DOCTYPE html>\n";
  var pageStr = pagePrefix + page.toString();

  // TODO: work on how the order of things are initialized happens
  try {
    $$.res.write(pageStr);
    // update ASAP
    bridge.raw("bootloader.__controller_name = '" + controller + "';");

    // Update the name of the controller on the page, when we can.
    // This also sets the $page element on the controller, inevitably
    bridge.call("core/client/controller", "set", controller, page.id);

    bridge.flush_data(page_options.content, "page_content");

    $$.res.write(bridge.render());
  } catch(e) {
    console.error(e);
    return;
  }

  resolve_futures();

};

var emitter = new EventEmitter();
module.exports = _.extend(emitter, { render: render_page, async: render_async});
