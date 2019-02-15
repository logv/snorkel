"use strict";


var cytoscape = require("./cytoscape.js");

var filters = require("snorkel$common/filters.js");
var sf_shim = require("snorkel$common/sf_shim.js");
var helpers = require("snorkel$common/sf_helpers.js");
var presenter = require("snorkel$common/sf_presenter.js");
var sf_marshal = require("snorkel$common/marshal.js");


var colors = ['#7cb5ec', '#434348', '#90ed7d', '#f7a35c', '#8085e9', '#f15c80', '#e4d354', '#8085e8', '#8d4653', '#91e8e1'];

var GraphView = _.extend({}, {
  initialize: function(ctx) {
    sf_shim.prepare_and_render(this, ctx);
  },
  baseview: helpers.VIEWS.TABLE,
  finalize: function() {},
  prepare: function(data) {
    data.results = sf_marshal.marshall_table_rows({ opts: data.parsed}, data.results);
    return data;

  },
  render: function() {
    var self = this;
    var $el = self.$el;
    var countEl = $("<h3 />");
    countEl.css({
      position: "absolute",
      right: "20px"
    });

    $el.append(countEl);
    var totalCount = 0;
    $el.height("100%");
    var height = Math.max($(window).height(), 600);
    $el.css("min-height", height + "px");

    var query_params = self.data.parsed.custom || self.data.parsed;
    var dim_one = query_params.dim_one;
    var dim_two = query_params.dim_two;

    var node_lookup = {};

    function make_node(name, group_by) {
      name = group_by.join(":") + " " + name;
      var node = node_lookup[name];
      var id = _.uniqueId("node");
      if (!node) {
        node = {
          data: {
            id: id,
            name: name,
            nodeColor: helpers.get_color(id)
          }
        };
        node_lookup[name] = node;
      }

      return node;
    }

    var edges = [];

    var max_str = 0;
    var max_weight = 0;

    _.each(self.data.results, function(res) {

      var group_by = [];
      _.each(res._id, function(v, k) {
        if (k === dim_one || k === dim_two) {
          return;
        }

        group_by.push(v);
      });

      var start = make_node(res._id[dim_one], group_by);
      var end = make_node(res._id[dim_two], group_by);

      var count = res.count;
      totalCount += count;
      start.data.weight = (start.data.weight || 0) + count;
      end.data.weight = (end.data.weight || 0) + count;

      max_weight = Math.max(start.data.weight, end.data.weight, max_weight);

      max_str = Math.max(count, max_str);

      edges.push({
        data: { source: start.data.id, target: end.data.id, strength: count,
          fromColor: helpers.get_color(start.data.id), toColor: helpers.get_color(end.data.id) }
      });


    });
    countEl.html("Samples: " + helpers.number_format(totalCount));

    var nodes = [];
    _.each(node_lookup, function(node) {
      nodes.push(node);
    });

    var cy = cytoscape({
      container: $el[0],

      boxSelectionEnabled: false,
      autounselectify: true,
      style: cytoscape.stylesheet()
        .selector('node')
          .css({
            'content': 'data(name)',
            'text-valign': 'center',
            'color': 'white',
            'text-outline-width': 2,
            'width': 'mapData(weight, 0, ' + max_weight + ', 40, 60)',
            'height': 'mapData(weight, 0, ' + max_weight + ', 40, 60)',
            'background-color': 'data(nodeColor)',
            'text-outline-color': 'data(nodeColor)'
          })
        .selector('edge')
          .css({
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'width': 'mapData(strength, 0, ' + max_str + ', 2, 10)',
            'line-color': 'data(fromColor)',
            'target-arrow-color': 'data(fromColor)'
          })
        .selector(':selected')
          .css({
            'background-color': 'black',
            'line-color': 'black',
            'target-arrow-color': 'black',
            'source-arrow-color': 'black'
          })
        .selector('.faded')
          .css({
            'opacity': 0.25,
            'text-opacity': 0
          }),


      elements: {
        nodes: nodes,
        edges: edges
      },
      layout: {
        name: 'cose',
        padding: 10
      }
    });

    cy.on('tap', 'node', function(e){
      var node = e.cyTarget;
      var neighborhood = node.neighborhood().add(node);

      cy.elements().addClass('faded');
      neighborhood.removeClass('faded');
    });

    cy.on('tap', function(e){
      if( e.cyTarget === cy ){
        cy.elements().removeClass('faded');
      }
    });

    cy.resize();
    $(window).on('resize', function() {
      cy.resize() ;
    });
  }

}, {
  icon: "noun/pin.svg"
});


module.exports = GraphView;

