
"use strict";

var _ = require_vendor("underscore");
var db = require_app("server/db");
var context = require_core("server/context");
var rbac = require_app("server/rbac");
var $ = require("cheerio");

module.exports = {
  get: function(table, cb) {
    cb = context.wrap(cb);

    var collection = db.get("dataset", "announcements");
    var table_name = table;
    if (table) {
      table_name = table.table_name || table;
    }
    var cur = collection.find({ table: table_name }).sort({ createdAt: -1});

    db.toArray(cur, function(err, arr) {
      cb(arr);
    });
  },

  render: function(ctx, api) {
    var user = ctx.req.user;
    var table = context("req").query.table;
    if (table) {
      table = table.table_name || table;
    }

    var editable = false;
    if (rbac.check("admin", table, user.username)) {
      editable = true;
    }
    return api.page.async(function(flush) {
      module.exports.get(table, function(announcements) {
        var commentWrapper = $("<div />");

        _.each(announcements, function(ann) {
          ann.editable = editable;
          ann.client_options = { ann_id: ann._id };
          var cmp = $C("dataset_announcement", ann);
          commentWrapper.append(cmp.toString());
        });
        var comment_str = commentWrapper.html();

        flush(comment_str);
      });
    })();
  },

  render_one: function(ctx, api, editable) {
    var user = ctx.req.user;
    var table = context("req").query.table;
    table = table.table_name || table;

    return api.page.async(function(flush) {
      module.exports.get(table, function(announcements) {
        var commentWrapper = $("<div />");

        var ann = _.first(announcements);
        if (!ann) {
          return flush("");
        }

        ann.editable = editable;
        ann.client_options = { ann_id: ann._id };
        var cmp = $C("dataset_announcement", ann);
        commentWrapper.append(cmp.toString());
        var comment_str = commentWrapper.html();

        flush(comment_str);
      });
    })();

  },

  add: function(table, comment, cb) {
    cb = context.wrap(cb);
    var table_name = table.table_name || table;

    var collection = db.get("dataset", "announcements");
    comment.createdAt = new Date();
    collection.insert({ table: table_name, comment: comment }, function(err, obj) {
      if (cb) {
        cb(obj);
      }
    });

  },
  delete: function(user, comment_id, cb) {
    cb = context.wrap(cb || function() { });
    var collection = db.get("dataset", "announcements");
    if (!comment_id) {
      return;
    }

    collection.findOne({ _id: comment_id }, function(err, obj) {
      var table = obj.table;
      if (!rbac.check("admin", table, user.username)) { return; }

      if (!err) {
        collection.remove({ _id: comment_id }, {});
        console.log("DELETING ANNOUNCEMENT", obj);
      }
      cb();
    });
  },

  install: function(socket) {
    var user = socket.session.__user;
    socket.on("new_announcement", function(table, announcement, cb) {
      if (!rbac.check("admin", table, user.username)) { return; }

      announcement.user = user.username;
      module.exports.add(table, announcement, function(obj) {
        console.log("ADDED ANNOUNCEMENT!", obj);
        cb(obj);
      });
    });

    socket.on("delete_announcement", function(ann_id, cb) {
      // TODO: pull the table from the announcement proper.
      console.log("DELETING ANNOUNCEMENT", ann_id);
      module.exports.delete(user, ann_id, cb);
    });

  },
  archive: function(ann_id, archive, cb) {
    // TODO: find the announcement and toggle its archived status

  }
};
