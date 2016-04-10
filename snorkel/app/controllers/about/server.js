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
        src: "images/screens/736150_10202314843256121_744855315_o.jpg",
        caption: "",
        title: "Overview"
      },
      {
        src: "images/screens/1271923_10201979227825945_1219996217_o.jpg",
        title: "Time Series"
      },
      {
        src: "images/screens/882570_10200883042702002_321476546_o.jpg",
        title: "Tables"
      },
      {
        src: "images/screens/901791_10200921066332569_292325925_o.jpg",
        caption: "",
        title: "Distributions"
      },
      {
        src: "images/screens/892232_10200978967460061_44860805_o.jpg",
        caption: "",
        title: "Bar Charts"
      },
      {
        src: "images/screens/882006_10200906789375654_548028791_o.jpg",
        title: "Area Charts"
      },
      {
        src: "images/screens/903010_10200906789335653_1345778720_o.jpg",
        caption: "",
        title: "Scatter Plots"
      },
      {
        src: "images/screens/1264245_10201979227905947_1254692173_o.jpg",
        title: "JSON API"
      },
    ];

    var template_str = template.render("controllers/about.html.erb", { slides: slides } );
    page.render({ content: template_str, header: header_str});
  },

  socket: function() {}
};
