"use strict";

var $ = require("cheerio");

var auth = require_root("server/auth");
var db = require_root("server/db");
var backend = require_root("server/backend");
var config = require_root("server/config");
var context = require_root("server/context");
var page = require_root("server/page");
var template = require_root("server/template");

var EventEmitter = require('events').EventEmitter;

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

    var after = _.after(2, function() {
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

        var cmp = $C("dataset_tile", {
          name: table.table_name,
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
      if (!err) {
        query_data = arr;
      }

      after();
    }));

    backend.get_tables(function(tables) {
      datasets = tables;

      after();
    });
  })(); // deref the asyncccccy
}

module.exports = {
  routes: {
    "" : "index",
  },

  index: auth.require_user(function() {
    var header_str = template.render("helpers/header.html.erb");
    var searchahead = $C("textinput", { name: "search" });
    var template_str = template.render("controllers/datasets.html.erb", { 
      render_searchahead: searchahead.toString,
      render_datasets: render_datasets
    });


    template.add_stylesheet("datasets");
    page.render({ content: template_str, header: header_str});
  }),

  socket: function(socket) {
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
