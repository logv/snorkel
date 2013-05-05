"use strict";

var auth = require_root("server/auth");
var bridge = require_root("server/bridge");
var context = require_root("server/context");
var db = require_root("server/db");
var metadata = require_root("server/metadata");
var page = require_root("server/page");
var template = require_root("server/template");
var queries = require_root("server/queries");
var querystring = require("querystring");

var $ = require("cheerio");

function get_portlet_for_query(query) {
  var width = 2;
  var height = 2;

  if (query.width && query.height) {
    width = parseInt(query.width, 10);
    height = parseInt(query.height, 10);
  }

  if (query.size === 'large') {
    width = 4;
    height = 4;
  }

  if (query.size === 'tall') {
    width = 2;
    height = 4;

  }

  if (query.size === 'small') {
    width = 2;
    height = 2;

  }

  if (query.size === 'wide') {
    width = 6;
    height = 4;
  }

  var portlet = $C("query_portlet", { 
    title: query.title,
    query_id: query.hashid,
    width: width * 2,
    height: height,
    table: query.parsed.table,
    description: query.description,
    client_options: query });

  return portlet;
}


function render_dashboard(query_func, title, editable) {
  var user = context("req").user;
  var dataset = context("req").query.dataset || "test/data";

  template.add_stylesheet("dashboard.css");
  template.add_stylesheet("query.css");

  context("title", title);

  var render_portlets = page.async(function(flush) {
    var div = $("<div class='portlet_holder'/>");
    query_func(user.username, dataset, function(saved) {

      if (saved.length) {
        _.each(saved, function(s) {
          var portlet = get_portlet_for_query(s);
          div.append(portlet.toString());
        });

        flush(div.toString());
      } else {
        flush(template.partial("dashboard/empty.html.erb"));
      }

    });
  });

  var delete_button = $C("button", { name: "Delete Dashboard", classes: "remove_dashboard" });

  var template_str = template.render("controllers/dashboard.html.erb", {
    render_portlets: render_portlets,
    render_remove_dashboard_button: delete_button.toString,
    title: title,
    editable: editable
  });

  page.async(function(flush) {
    metadata.all(function(all) {
      bridge.controller("dashboard", "set_metadata", all);
      flush();
    });
  })();

  var header_str = template.render("helpers/header.html.erb", { });

  page.render({ content: template_str, header: header_str });
  bridge.flush_data();
}


function handle_remove_portlet(socket, dashboard, portlet) {
  if (_.isString(portlet)) {
    portlet = querystring.parse(portlet);
  }

  var collection = db.get("query", "dashboards");
  collection.findOne({name: dashboard}, context.wrap(function(err, config) {
    config.dashboards = _.filter(config.dashboards, function(c) { return c.hashid !== portlet.hashid; });

    function done() {
      socket.emit("updated_dashboard");
    }

    if (config._id) {
      collection.update({_id: config._id}, config, done);
    } else {
      collection.insert(config, done);
    }
  }));
}

function get_dashboards(user, cb) {
  var collection = db.get("query", "dashboards");
  cb = context.wrap(cb);
  collection.find({}, { name: 1 }, function(err, cur) {
    cur.toArray(function(err, results) {
      if (!err) {

        var dashboard_names = _.map(results, function(r) { return r.name; }); 
        dashboard_names.sort();
        dashboard_names = _.without(_.uniq(dashboard_names), null);

        if (cb) {
          cb(dashboard_names);
        }
      }
    });
  });
}

function handle_new_dashboard(socket, dashboard, cb) {
  var collection = db.get("query", "dashboards");
  var done = context.wrap(cb);
  collection.findOne({name: dashboard}, context.wrap(function(err, config) {
    if (!config) {
      config = {
        name: dashboard 
      };
      collection.insert(config, done);
    }
  }));
}

function handle_remove_dashboard(socket, dashboard, cb) {
  var collection = db.get("query", "dashboards");
  var done = context.wrap(cb);
  collection.remove({name: dashboard}, done);
}

function handle_order_portlets(socket, dashboard, query_ids, cb) {
  var collection = db.get("query", "dashboards");
  cb = context.wrap(cb);
  collection.findOne({name: dashboard}, context.wrap(function(err, config) {
    if (!err) { 
      config.order = query_ids; 
      collection.update({_id: config._id}, config, cb);
    }

  }));

}

function handle_update_portlet(socket, portlet) {
  if (_.isString(portlet)) {
    portlet = querystring.parse(portlet);
  }

  var dashboard = portlet.dashboard;

  if (portlet.query_id && !portlet.hashid) {
    portlet.hashid = portlet.query_id;
  }

  var collection = db.get("query", "dashboards");
  collection.findOne({name: dashboard}, context.wrap(function(err, config) {
    if (!config) {
      config = {
        name: dashboard 
      };
    }

    config.dashboards = _.filter(config.dashboards, function(c) { return c.hashid !== portlet.hashid; });
    config.dashboards.push(portlet);
    function done() {
      socket.emit("updated_dashboard");
    }

    if (config._id) {
      collection.update({_id: config._id}, config, done);
    } else {
      collection.insert(config, done);
    }
  }));
}

module.exports = {
  routes: {
    "" : "get_custom",
    "/saved" : "get_saved",
    "/recent" : "get_recent",
    "/shared" : "get_shared",
    "/custom" : "get_custom"
  },

  index: function() {
    render_dashboard(queries.get_saved_for_user, "Saved Queries");
  },

  get_recent: function() {
    render_dashboard(queries.get_recent_queries_for_user, "Recent Queries");
  },

  get_saved: function() {
    render_dashboard(queries.get_saved_for_user, "Saved Queries");
  },

  get_shared: function() {
    render_dashboard(queries.get_saved_for_dataset, "Shared Queries");
  },

  get_custom: function() {
    var dashboard = context("req").query.id;

    if (!dashboard) {
      return context("res").redirect("/dashboards");
    }

    var dashboard_collection = db.get("query", "dashboards");


    bridge.controller("dashboard", "set_dashboard", dashboard);

    dashboard_collection.findOne({ name: { $in: [dashboard] }}, context.wrap(function(err, config) {
      if (err || !config) {
        console.log("COULDNT FIND CONFIG FOR DASHBOARD: ", dashboard, config);
        return page.render("Couldn't find custom dashboard config: " + dashboard);
      }

      var conditions = {
        'hashid' : { "$in" : _.map(config.dashboards, function(c) { return c.hashid; }) }
      };

      render_dashboard(function(username, dataset, cb) {
        var collection = db.get("query", "results");
        cb = context.wrap(cb);

        collection.find(conditions, { results: 0 }, function(err, data) {
          data.toArray(function(err, arr) {
            var ret = {};
            var sorted = [];
            _.each(arr, function(r) {
              ret[r.hashid] = r;
              var found = _.find(config.dashboards, function(c) { return c.hashid === r.hashid; });
              _.extend(ret[r.hashid], found);
            });

            if (config.order) {
              _.each(config.order, function(query_id) {
                if (ret[query_id]) {
                  sorted.push(ret[query_id]);
                  delete ret[query_id];
                }
              });
            }

            _.each(ret, function(query, id) {
              sorted.push(query);
            });

            cb(sorted);
          });
        });
      }, dashboard, true);
    }));
  },

  socket: function(socket) {
    socket.on("refresh_query", function(query_data) {
      // Avoid circular deps, please
      var query_controller = require_root("controllers/query/server");

      query_controller.refresh(query_data, 'ukn', socket);
    });

    socket.on("save_query", function(query, name, info) {
      // Avoid circular deps, please
      var query_controller = require_root("controllers/query/server");
      console.log("RENAMING QUERY", query, name, info);
      query_controller.save(socket, query, name, info);
    });


    socket.on("order_portlets", function(dashboard, query_ids) {
      handle_order_portlets(socket, dashboard, query_ids, function() {
        socket.emit("ordered_portlets"); 
      });
    });

    socket.on("update_portlet", function(dashboard, portlet) {
      handle_update_portlet(socket, portlet);
    });

    socket.on("remove_portlet", function(dashboard, portlet) {
      handle_remove_portlet(socket, dashboard, portlet);
    });

    socket.on("remove_dashboard", function(dashboard, fn) {
      handle_remove_dashboard(socket, dashboard, function() {
        fn("OK");
      });
    });

  },

  update_portlet: handle_update_portlet,
  remove_portlet: handle_remove_portlet,
  new_dashboard: handle_new_dashboard,
  remove_dashboard: handle_remove_dashboard,
  get_dashboards: get_dashboards
};

module.exports.get_custom = auth.require_user(module.exports.get_custom);
module.exports.get_recent = auth.require_user(module.exports.get_recent);
module.exports.get_saved = auth.require_user(module.exports.get_saved);
module.exports.get_shared = auth.require_user(module.exports.get_shared);
