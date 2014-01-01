/**
 * This module deals with how pages are generated, rendered and delivered to
 * the client. Each server controller is expected to use this API (or the res
 * object) to send a response to the client.
 *
 * @class page (server)
 * @module Superfluous
 * @submodule Server
 *
 */

"use strict";

var context = require("./context");
var bridge = require("./bridge");
var EventEmitter = require('events').EventEmitter;
var quick_hash = require_core("server/hash");
var readfile = require_core("server/readfile");
var async = require("async");

var cheerio = require("cheerio");
var app = require_core("server/main").app;


var __async_id = 0;
context.setDefault("ASYNC_FUTURES", []);

/**
 * Async page rendering function. It takes a function to run inside an async context
 * and returns a placeholder to be rendered in its placed.
 *
 * @method async
 */
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

var do_async = function(func) {
  render_async(func)();
}

function resolve_futures() {
  // FUTURES ARE ASYNC, NEED TO USE context() HERE
  // Execute all future funcs, now
  var futures = context("ASYNC_FUTURES");

  var ctx = context.get();
  ctx.enter();
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
        context("stream").write("</div>");
        context("stream").end();

        // DO NOT RELY ON THIS, IT IS A TEST HOOK!
        if (context("__testing")) {
          var test_hook = context("__on_page_end");
          if (test_hook) {
            test_hook();
          }
        }

        var controller_instance = context("controller_instance");
        if (controller_instance && controller_instance.after_request) {
          controller_instance.after_request();
        }


        ctx.exit();
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


/**
 * The main page rendering function. It takes an array of options specifying
 * what to render in the page.
 *
 * @method render
 */
var render_page = function(page_options) {
  var bootloader_controller = require_core("controllers/bootloader/server");
  var $$ = context.get();

  // any dependencies after this will have to be bootloaded in
  var controller = $$.controller;

  // strip controller slashes (just in case)
  controller = controller.replace(/^\/*/, '');

  // render into page formata
  var controller_include = require("path").join(controller, "client");
  var controller_client_path = require_core("server/controller").get_full_path(controller_include);
  var hash = quick_hash(readfile(controller_client_path));
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
    var config = require("./config");
    var template = require("./template");
    var misc_header = "";
    var use_socket = page_options.socket || context("added_socket");
    var use_component = page_options.component || false;

    if (use_component) {
      template.add_javascript("core/client/component");
    }

    var use_storage = false; // TODO: turn this on for production environments
    if (config.RELEASE) {
      use_storage = true;
    }

    var use_chunked_xhr = false; // TODO: turn this on after more testing

    var use_fullscreen = $$.use_fullscreen;
    var pageId = _.uniqueId("pg_");
    var simple_pipe = config.simple_pipe;
    if ($$.req.query.simple_pipe) {
      console.info("Using simple pipe delivery");
      simple_pipe = true;
    }

    var page = template.render_core("helpers/page.html.erb", {
      header: page_options.header,
      head_supplements: $$.HEAD_SUPPLEMENTS,
      controller: controller,
      use_storage: use_storage,
      use_fullscreen: use_fullscreen,
      use_chunked_xhr: use_chunked_xhr,
      js_deps: [],
      css_deps: [],
      content: page_options.content,
      hash: hash,
      release: config.RELEASE,
      socket_header: use_socket && template.socket_header(socket_hash),
      title: $$.title || "SF",
      id: pageId,
      misc_header: misc_header,
      js_header: template.js_header(js_hash),
      simple_pipe: simple_pipe,
      css_header: template.css_header(css_hash)
    });

    var pageStr = page.toString();
    // TODO: work on how the order of things are initialized happens
    $$.res.setHeader('Content-Type', 'text/html');
    $$.res.setHeader('Content-Encoding', 'gzip');
    $$.stream.write(pageStr);
    // Update the name of the controller on the page, when we can.
    // This also sets the $page element on the controller, inevitably
    bridge.call("core/client/controller", "set", controller, pageId, hash);

    if (!simple_pipe) {
      bridge.flush_data(page_options.content, "page_content");
    }

    $$.stream.write("<div data-bridge-id='async'>");
    $$.stream.write(bridge.render());
    try {

      $$.stream.flush();
    } catch(e) {
      console.error(e);
      console.trace();
      return;
    }

    resolve_futures();

  });
};

var emitter = new EventEmitter();
module.exports = _.extend(emitter, {
  render: render_page,
  async: render_async,
  defer: do_async,
  placeholder: render_async
});
