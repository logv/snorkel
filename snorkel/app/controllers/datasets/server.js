"use strict";

var $ = require("cheerio");

var rbac = require_app("server/rbac");
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
var announcements = require_app("server/announcements");

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
    var found_data = {};

    var after = _.after(2, function() {
      var datasetsEl = $("<div />");
      var hiddenEl = $("<div class='hidden_datasets noselect' />");
      var parentEl = $("<div />");
      parentEl.append(datasetsEl);

      var headerEl = $("<h1 />");
      headerEl.text("hidden/");
      headerEl.prepend("<span class='status'>&gt;</span>");

      parentEl.append(hiddenEl);
      hiddenEl.append(headerEl);

      _.each(datasets, function(table) {
        if (table.table_name === "undefined") { return; }

        var metadata_ = {
          name: table.table_name,
          description: ''
        };

        if (metadatas) {
          var newdata = _.find(metadatas, function(m) {
            if (!m) { return; }

            var this_name = m.table.table_name || m.table;
            var table_name = table.table_name || table;

            return table_name === this_name;
          });

          if (newdata) {
            _.extend(metadata_, _.clone(newdata.metadata));
          }

        }

        var table_name = metadata_.name.table_name || metadata_.name;
        var dataset_tokens = table_name.split(backend.SEPARATOR);
        var display_name = metadata_.display_name || dataset_tokens.join("/");
        if (backend.SEPARATOR != "/") {
          while (display_name.indexOf(backend.SEPARATOR) >= 0) {
            display_name = display_name.replace(backend.SEPARATOR, "/");
          }
        }

        found_data[table_name] = metadata_;
        metadata_.display_name = display_name;

      });





      // Do a descending sort on query counts
      var sorted_datasets = _.sortBy(datasets, function(dataset) {
        return found_data[dataset.table_name || dataset.name].display_name;
      });

      var parents = {};

      _.each(sorted_datasets, function(table) {
        var metadata_ = found_data[table.table_name];
        var table_name = metadata_.name.table_name;
        var display_name = metadata_.display_name;
        var dataset_tokens = display_name.split("/");
        var superset = dataset_tokens[0];

        if (!rbac.check("query", table.table_name, user.username)) { return; }

        var editable = dataset_is_editable(table.table_name, user);
        var cmp = $C("dataset_tile", {
          name: table_name || table.table_name,
          display_name: display_name.replace(superset + "/", ""),
          description: metadata_.description,
          editable: editable,
          client_options: {
            dataset: table.table_name
          },
          delegate: {
            "change" : "table_changed",
            "click .delete" : "handle_delete_clicked"
          }
        });

        if (metadata_.hide_dataset == "true") {
          hiddenEl.append(cmp.toString());
        } else {
          var supersetEl = parents[superset];
          if (!supersetEl) {
            parents[superset] = $("<div class='superset clearfix noselect'>");
            supersetEl = parents[superset];
            supersetEl.attr("id", superset);

            var headerEl = $("<h1 />");
            headerEl.text(superset + "/");
            headerEl.prepend("<span class='status' >&gt;</span>");

            supersetEl.append(headerEl);
            datasetsEl.append(supersetEl);

          }

          supersetEl.append(cmp.toString());
        }

      });

      flush_data(parentEl.toString());
    });

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
    "/announcements" : "get_announcements",
    "/edit" : "get_edit",
    "/info" : "get_info"
  },
  post_routes: {
    "/info" : "set_info"
  },

  index: auth.require_user(function() {
    var header_str = template.render("helpers/header.html.erb");
    var searchahead = $C("textinput", { name: "search" });

    var upload_csv = config.upload_csv;

    var template_str = template.render("controllers/datasets.html.erb", {
      render_searchahead: searchahead.toString,
      render_datasets: render_datasets,
      upload_csv: upload_csv
    });


    template.add_stylesheet("datasets");
    page.render({ content: template_str, header: header_str});
  }),


  get_announcements: auth.require_user(function(ctx, api) {
    var req = context("req");
    var res = context("res");

    var dataset = req.query.dataset;
    var subset = req.query.subset;
    var table = req.query.table || (dataset + "/" + subset);

    var edit_header_link = $("<div class='mtm mbl mll lfloat' />");
    var editEl = $("<a style='color: white'>Settings</a>")
      .addClass("dataset_settings mrl mll")
      .attr('href', '/datasets/edit?table=' +  table)
      .attr('target', '_blank');

    var edit_link = editEl.toString();
    edit_header_link.append(edit_link);


    var announcementEl = $("<a style='color: white'>Back to Table</a>")
      .addClass("back_to_table mrl mll")
      .attr('href', '/query?table=' +  table);


    edit_header_link.append(announcementEl.toString());

    var header_str = template.render("helpers/header.html.erb", {
      tabs: function() {
        return $("<div>")
          .append(edit_header_link)
          .html();
      }
    });

    bridge.controller("datasets", "set_table", table);

    var user = req.user;
    var editable = rbac.check("admin", table, user.username);

    api.template.add_stylesheet("announcements");
    var render_async = template.partial("datasets/announcements.html.erb", {
      editable: editable,
      render_announcements: function() {
        return announcements.render(ctx, api);
      }
    });


    page.render({
      content: render_async.toString(),
      header: header_str,
      socket: true,
      component: true});
    bridge.flush_data();


  }),

  get_edit: auth.require_user(function(ctx, api) {
    var req = context("req");
    var res = context("res");

    var dataset = req.query.dataset;
    var subset = req.query.subset;
    var table = req.query.table || (dataset + "/" + subset);

    var edit_header_link = $("<div class='mtm mbl mll lfloat' />");
    var editEl = $("<a style='color: white'>Announcements</a>")
      .addClass("dataset_announcements mrl mll")
      .attr('href', '/datasets/announcements?table=' +  table)
      .attr('target', '_blank');

    var edit_link = editEl.toString();
    edit_header_link.append(edit_link);


    var announcementEl = $("<a style='color: white'>Back to Table</a>")
      .addClass("back_to_table mrl mll")
      .attr('href', '/query?table=' +  table);


    edit_header_link.append(announcementEl.toString());

    var header_str = template.render("helpers/header.html.erb", {
      tabs: function() {
        return $("<div>")
          .append(edit_header_link)
          .html();
      }
    });

    bridge.controller("datasets", "set_table", table);

    var _metadata;
    var user = req.user;
    var editable = rbac.check("admin", table, user.username);

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

    function render_table_header(int_col) {
      var header = $("<tr>");
      var headers = [ "name", "display name", "description", "hidden"];
      if (int_col) {
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
        var opts = {};
        _.each(_metadata.col_types.integer, function(c) { opts[c.name] = c.display_name || c.name; });

        var timeColEl = $C("selector", {
          name: "time_col",
          options: opts,
          selected: _metadata.time_col
        });

        var hiddenEl = $C("selector", {
          name: "hide_dataset",
          options: {
            false : "false",
            true: "true"
          },
          selected: _metadata.hide_dataset
        });

        var rss_feed = _metadata.rss_feed;
        var template_str = template.partial("datasets/edit.html.erb", {
          name: table,
          rss_feed: rss_feed,
          display_name: _metadata.display_name || _metadata.name,
          description: _metadata.description,
          col_types: _metadata.col_types,
          render_column: render_column,
          render_table_header: render_table_header,
          time_col: timeColEl.toString(),
          render_announcements: function() {
            return announcements.render(ctx, api);
          },
          editable: editable,
          hidden_col: hiddenEl.toString()
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
    announcements.install(socket);

    var user = socket.session.__user;
    socket.on("set_metadata", function(table, metadata_) {
      if (table && metadata_) {
        metadata.set(table, metadata_, function() {
          socket.emit("set_metadata", "OK");
        });
      } else {
        socket.emit("set_metadata", "NOK");
      }

    });

    socket.on("clear_cache", function(dataset) {
      // Validate this is an easily droppable dataset
      backend.clear_cache(dataset);
      socket.emit("cleared_cache");
    });


    socket.on("drop", function(dataset) {
      // Validate this is an easily droppable dataset
      if (dataset_is_editable(dataset, user)) {
        console.log("DROPPING ", dataset);

        backend.drop(dataset, function() {
          socket.emit("dropped", dataset);
        });
      }
    });
  }
};
