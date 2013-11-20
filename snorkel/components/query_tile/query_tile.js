"use strict";

module.exports = {
  tagName: "div",
  className: "query_tile",
  defaults: {
    results: ""
  },
  client: function(options) {
    var $el = this.$el;

    var title = $el.find(".title").html();
    var query = options.query;
    var editing = false;

    this.$el.hover(function() {
      if (!editing) {
        $el.find(".icon").show();
      }
    }, function() {
      $el.find(".icon").hide();
    });

    if (query.created) {
      var created_str = (new Date(query.created)).toISOString();


      $C("timeago", {time: created_str }, function(cmp) {
        $el.find(".created.timestamp").append(cmp.$el);
      });
    }

    if (query.updated) {
      var updated_str = (new Date(query.updated)).toISOString();
      $el.find(".updated").show();
      $C("timeago", {time: updated_str }, function(cmp) {
        $el.find(".updated .timestamp").append(cmp.$el);
      });
    }

    var that = this;
    $C("xeditable", { content: title, toggle: "manual" }, function(cmp) {
      $el.find(".title").empty().append(cmp.$el);
      that.editable = cmp;
      cmp.on("save", function(evt, data) {
        editing = false;
        var newValue = data.newValue;
        SF.controller().trigger("rename_query", query, newValue);
      });

      cmp.on("shown", function() {
        editing = true;
        $el.find(".icon").hide();
      });

      cmp.on("hidden", function() {
        editing = false;
      });
    });
  }
};
