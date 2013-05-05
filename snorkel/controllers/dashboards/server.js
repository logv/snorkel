'use strict';

var $ = require("cheerio");
var _ = require_vendor("underscore");
var auth = require_root("server/auth");
var page = require_root("server/page");
var template = require_root("server/template");
var dashboard_controller = require_root("controllers/dashboard/server");

module.exports = {
  routes: {
    "" : "index"
  },

  render_dashboards: function(cb) {
    dashboard_controller.get_dashboards(null, function(results) {
      var dashes = $("<div />");

      _.each(results, function(dashboard) {
        var dashEl = $("<a>").html(dashboard);
        dashEl.attr('href', '/dashboard?id=' + dashboard);
        var header = $("<h2>");
        header.append(dashEl);
        dashes.append(header);
      });

      cb(dashes.toString());
    });
  },

  index: auth.require_user(function() {
      var header_str = template.render("helpers/header.html.erb");
      var render_dashboards = page.async(this.render_dashboards);
      var template_str = template.render("controllers/dashboards.html.erb", {
        render_dashboards: render_dashboards
      });


      template.add_stylesheet("dashboards");
      page.render({ content: template_str, header: header_str});

  }),

  socket: function() {}
};
