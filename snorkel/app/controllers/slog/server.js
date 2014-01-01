"use strict";

var controller = require_core("server/controller");
// Helpers for serialized form elements
var store = require_core("server/store");
var value_of = controller.value_of,
    array_of = controller.array_of;


var util = require("util");
var _sockets = [];
var _msgs = [];
var MAX_LINES = 1000;
function write_log_to_store() {
  var used_store = store.get();
  var last_msgs = _.last(_msgs, MAX_LINES);
  used_store.set("slog_lines", last_msgs);
}
var sync_log = _.throttle(write_log_to_store, 1000);

module.exports = {
  // If the controller has assets in its subdirs, set is_package to true
  is_package: true,
  routes: {
    "" : "index",
  },

  index: function(ctx, api) {
    var template_str = api.template.render("slog/slog.html.erb", {});
    this.set_title("slog");
    var req = ctx.req;
      console.log("slog session loaded from", req.ip, "(", req.sessionID, ")");
    api.template.add_stylesheet("slog/slog");
    api.page.render({ content: template_str, socket: true});
         },

  install: function() {
    store.get().get("slog_lines", function(err, msgs) {
      if (_.isArray(msgs)) {
        _msgs = msgs;
      }
    });

    var new_log = function(type) {
      return function() {
        var args = _.toArray(arguments);
        var log_str = _.map(args, function(s) {
          if (_.isObject(s)) {
            try {
              return JSON.stringify(s);
            } catch (e)  { 
              return util.inspect(s); 
            }
          }

          if (s) {
            return s.toString();
          }

          return "";
        }).join(" ");

        var line = { msg: log_str, ts: +Date.now(), type: type };
        _msgs.push(line);

        return console.log_no_ts.apply(console, arguments);
      };
    };

    global.console.slog = new_log("success");
    global.console.log = new_log("");
    global.console.warn = new_log("warning");
    global.console.error = new_log("danger");
    global.console.info = new_log("info");

    console.info("Installed SLOG handlers");
  },

  socket: function(s) {
    // Emit a replay, and start logging messages they haven't seen yet
    s.emit("msgs", _msgs);

    var start = +Date.now();
    s.on("since", function(cb) {
      var ts_in_ms = start;
      // Go through the msgs, looking for the earliest one to break at
      var msgs = _.filter(_.last(_msgs, 5), function(o) {
        return o.ts > ts_in_ms;
      });

      start = +Date.now();
      cb(msgs);
    });

    s.on("clear", function(cb) {
      _msgs = [];
      sync_log();
      if (cb) {
        cb();
      }
    });
  }
};
