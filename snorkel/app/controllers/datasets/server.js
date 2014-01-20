"use strict";

var $ = require("cheerio");

var db = require_app("server/db");
var config = require_core("server/config");
var context = require_core("server/context");
var page = require_core("server/page");
var template = require_core("server/template");
var bridge = require_core("server/bridge");
var EventEmitter = require('events').EventEmitter;

var auth = require_app("server/auth");
var backend = require_app("server/backend");
var metadata = require_app("server/metadata");

function dataset_is_editable(dataset, user) {
  var split_set = dataset.split("/");
  var username = user.username.split("@").shift();

  var suffix = split_set.pop();
  var editable = false;

  if (config.superuser && config.superuser[user.username]) {
    return true;
  }

  if (split_set.length && username === split_set[0]) {
    editable = true;
  }

  return editable;
}

// need to also get metadata for the datasets, too
function render_datasets() {
  return page.async(function(flush_data) {
    var collection = db.get("query", "results");
    var req = context("req");
    var user = req.user;
    var conditions = { username: user.username };

    var query_data;
    var datasets;
    var metadatas;

    var after = _.after(3, function() {
      var table_options = {};
      var datasetsEl = $("<div />");

      var query_counts = {};
      _.each(query_data, function(result) {
        query_counts[result._id.dataset] = result.count;
      });

      // Do a descending sort on query counts
      datasets.sort(function(a, b) {
        return (query_counts[b.table_name] || 0) - (query_counts[a.table_name] || 0);
      });

      _.each(datasets, function(table) {
        if (table.table_name === "undefined") { return; }
        var editable = dataset_is_editable(table.table_name, user);
        var metadata_ = {
          name: table.table_name,
          description: ''
        };

        if (metadatas) {
          var newdata = _.find(metadatas, function(m) {
            if (!m) { return; }

            return m.table === table.table_name;
          });

          if (newdata) {
            _.extend(metadata_, newdata.metadata);
          }

        }

        var cmp = $C("dataset_tile", {
          name: metadata_.name,
          display_name: metadata_.display_name,
          description: metadata_.description,
          editable: editable,
          queries: query_counts[table.table_name],
          client_options: {
            dataset: table.table_name
          },
          delegate: {
            "change" : "table_changed",
            "click .delete" : "handle_delete_clicked"
          }
        });

        datasetsEl.append(cmp.toString());
      });

      flush_data(datasetsEl.toString());
    });

    collection.aggregate([
      { $match: conditions },
      { $project: { "dataset": "$parsed.table" }},
      { $group: { _id: { "dataset" : "$dataset" }, count: { "$sum": 1 }}},
      { $sort: { count: -1 }}
    ], context.wrap(function(err, arr) {
      if (!err) { query_data = arr; }
      after();
    }));

    backend.get_tables(function(tables) {
      datasets = tables;
      after();
    });

    metadata.all(function(datas) {
      metadatas = datas;
      after();
    });
  })(); // deref the asyncccccy
}

module.exports = {
  routes: {
    "" : "index",
    "/edit" : "get_edit",
    "/info" : "get_info"
  },
  post_routes: {
    "/info" : "set_info"
  },

  index: auth.require_user(function() {
    var header_str = template.render("helpers/header.html.erb");
    var searchahead = $C("textinput", { name: "search" });
    var dashboards_controller = require_app("controllers/dashboards/server");

    var render_dashboards = page.async(dashboards_controller.render_dashboards);
    var template_str = template.render("controllers/datasets.html.erb", {
      render_searchahead: searchahead.toString,
      render_datasets: render_datasets,
      render_dashboards: render_dashboards
    });


    template.add_stylesheet("datasets");
    page.render({ content: template_str, header: header_str});
  }),


  get_edit: auth.require_user(function() {
    var req = context("req");
    var res = context("res");

    var dataset = req.query.dataset;
    var subset = req.query.subset;
    var table = req.query.table || (dataset + "/" + subset);

    var header_str = template.render("helpers/header.html.erb");
    bridge.controller("datasets", "set_table", table);

    var _metadata;

    function render_column(col_data) {
      var data = _.clone(col_data);
      var col_meta = _metadata.columns[col_data.name];

      var client_options = {};
      _.extend(data, col_meta);
      _.extend(client_options, col_meta);
      if (!data.formatter) {
        data.formatter = "";
      }

      data.client_options = {
        metadata: client_options
      };


      var colCmp = $C("column_metadata_row", data);

      return colCmp.toString();
    }

    function render_table_header(add_cast) {
      var header = $("<tr>");
      var headers = [ "name", "display name", "description", "hidden", "formatter" ];
      if (add_cast) {
        headers.push("groupable");
      }

      _.map(headers, function(col) {
        header.append($("<th>").html(col));
      });

      return header.html();
    }

    var render_async = page.async(function(flush) {
      metadata.get(table, function(meta) {
        _metadata = meta.metadata;
        var rss_feed = _metadata.rss_feed;
        var template_str = template.partial("datasets/edit.html.erb", {
          name: table,
          rss_feed: rss_feed,
          display_name: _metadata.display_name || _metadata.name,
          description: _metadata.description,
          col_types: _metadata.col_types,
          render_column: render_column,
          render_table_header: render_table_header
        });

        bridge.controller("datasets", "initialize_editor");
        flush(template_str);
      });
    })();

    page.render({ 
      content: render_async.toString(), 
      header: header_str, 
      socket: true, 
      component: true});
    bridge.flush_data();


  }),

  socket: function(socket) {
    socket.on("set_metadata", function(table, metadata_) {
      if (table && metadata_) {
        metadata.set(table, metadata_, function() {
          socket.emit("set_metadata", "OK");
        });
      } else {
        socket.emit("set_metadata", "NOK");
      }

    });

    socket.on("new_dashboard", function(dashboard, fn) {
      var dashboard_controller = require_app("controllers/dashboard/server");
      dashboard_controller.new_dashboard(socket, dashboard, function(err) {
        if (err) {
          fn("NOK");
        } else {
          fn("OK");
        }
      });
    });

    socket.on("clear_cache", function(dataset) {
      // Validate this is an easily droppable dataset
      backend.clear_cache(dataset);
      socket.emit("cleared_cache");
    });

    socket.on("drop", function(dataset) {
      // Validate this is an easily droppable dataset
      var user = socket.manager.__user;
      if (dataset_is_editable(dataset, user)) {
        console.log("DROPPING ", dataset);

        backend.drop(dataset, function() {
          socket.emit("dropped", dataset);
        });
      }
    });
  }
};
