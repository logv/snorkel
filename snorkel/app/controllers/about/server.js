"use strict";

var controller = require_core("server/controller");
var page = require_core("server/page");
var template = require_core("server/template");

// Helpers for serialized form elements
var value_of = controller.value_of,
    array_of = controller.array_of;


module.exports = {
  routes: {
    "" : "index",
  },

  index: function() {
    var header_str = template.render("helpers/header.html.erb", {});
    var slides = [
      {
        src: "images/screens/Screenshot_2016-08-31_07-24-27.png",
        caption: "",
        title: "Default view"
      },
      {
        src: "images/screens/Screenshot_2016-08-31_07-26-49.png",
        caption: "",
        title: "Table View"
      },
      {
        src: "images/screens/Screenshot_2016-08-31_07-30-50.png",
        caption: "",
        title: "Distribution View (Moments)"
      },
      {
        src: "images/screens/Screenshot_2016-08-31_11-53-01.png",
        caption: "",
        title: "Distribution View (Graphs)"
      },
      {
        src: "images/screens/Screenshot_2016-04-30_18-50-20.png",
        caption: "",
        title: "Overview"
      },
      {
        src: "images/screens/Screenshot_2016-04-30_18-51-11.png",
        caption: "",
        title: "Overview (cont'd)"
      },
      {
        src: "images/screens/Screenshot_2016-08-31_07-25-05.png",
        caption: "",
        title: "Time Series"
      },
      {
        src: "images/screens/Screenshot_2016-08-31_07-25-43.png",
        caption: "",
        title: "Stacked Time Series"
      },
      {
        src: "images/screens/Screenshot_2016-08-31_07-26-25.png",
        caption: "",
        title: "Time series forecasting"
      },
      {
        src: "images/screens/Screenshot_2016-08-31_07-32-51.png",
        caption: "",
        title: "Anomaly detection"
      },
      {
        src: "images/screens/Screenshot_2016-04-30_18-51-55.png",
        caption: "",
        title: "Bar Charts"
      },
      {
        src: "images/screens/Screenshot_2016-08-31_07-27-57.png",
        caption: "",
        title: "Timelines"
      },
      {
        src: "images/screens/Screenshot_2016-08-31_07-29-37.png",
        caption: "",
        title: "Scatter plots"
      },
      {
        src: "images/screens/Screenshot_2016-08-31_07-32-23.png",
        caption: "",
        title: "Scatter plots (cont'd)"
      },
      {
        src: "images/screens/Screenshot_2016-04-30_18-52-23.png",
        caption: "",
        title: "Scatter plots (cont'd)"
      },
      {
        src: "images/screens/Screenshot_2016-08-31_07-33-23.png",
        caption: "",
        title: "Samples"
      },
      {
        src: "images/screens/1264245_10201979227905947_1254692173_o.jpg",
        caption: "",
        title: "JSON API"
      },
      {
        src: "images/screens/Screenshot_2016-08-31_11-50-13.png",
        caption: "",
        title: "Dataset Settings"
      },
    ];


    var template_str = template.render("controllers/about.html.erb", { slides: slides } );
    page.render({ content: template_str, header: header_str});
  },

  socket: function() {}
};
