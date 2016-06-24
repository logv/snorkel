"use strict";

var helpers = require("app/client/views/helpers");
var BaseView = require("app/client/views/base_view");
var presenter = require("app/client/views/presenter");
var filter_helper = require("app/controllers/query/filters");

var colors = ['#7cb5ec', '#434348', '#90ed7d', '#f7a35c', '#8085e9', '#f15c80', '#e4d354', '#8085e8', '#8d4653', '#91e8e1'];

var GraphView = BaseView.extend({
  baseview: helpers.VIEWS.TABLE,
  events: {
  },
  prepare: function(data) {
    return data;

  },
  render: function() {
    var self = this;
    var fields = SF.controller().get_fields(self.table);
		var $el = self.$el;
		$el.height("100%");
    var height = Math.max($(window).height(), 600);
    $el.css("min-height", height + "px");

    var query_params = self.data.parsed;
    var dim_one = query_params.dim_one;
    var dim_two = query_params.dim_two;

    var node_lookup = {};

    function make_node(name, group_by) {
      name = group_by.join(":") + " " + name;
      var node = node_lookup[name];
      if (!node) {
        node = {
          data: {
            id: _.uniqueId("node"),
            name: name
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
      start.data.weight = (start.data.weight || 0) + count;
      end.data.weight = (end.data.weight || 0) + count;

      max_weight = Math.max(start.data.weight, end.data.weight, max_weight);

      max_str = Math.max(count, max_str);

      edges.push({
        data: { source: start.data.id, target: end.data.id, strength: count }
      });


    });

    var nodes = [];
    _.each(node_lookup, function(node) {
      nodes.push(node);
    });

    $C("cytocharter", {}, function() {
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
							'backgrund-color': '#999',
							'text-outline-color': '#999'
						})
					.selector('edge')
						.css({
							'curve-style': 'bezier',
							'target-arrow-shape': 'triangle',
							'target-arrow-color': '#ccc',
              'width': 'mapData(strength, 0, ' + max_str + ', 2, 10)',
							'line-color': '#ccc'
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
    });
  }

}, {
  icon: "noun/pin.svg"
});

function build_custom_controls(fields) {
  var custom_controls = $("<div class='clearfix'/>");

  // need to figure out the selected option based on the current URL, right?
  var options = { "": "" };
  _.each(fields, function(field) {
    if (field.final_type === "string" || field.type_str === "string") {
      options[field.name] = field.display_name || field.name;
    }
  });


  var query_params = SF.controller().get_current_query();
  var dim_one = query_params.dim_one;
  var dim_two = query_params.dim_two;

  $C("selector", {
    name: "dim_one",
    options: options,
    selected: dim_one,
  }, function(selector) {
    $C("query_control_row", {
      label: "Prev Node",
      component: selector.toString()
    }, function(cmp) {
      custom_controls.append(cmp.$el);

    });
  });

  $C("selector", {
    name: "dim_two",
    options: options,
    selected: dim_two,
  }, function(selector) {
    $C("query_control_row", {
      label: "Node",
      component: selector.toString()
    }, function(cmp) {
      custom_controls.append(cmp.$el);

    });
  });


  return custom_controls;
}


SF.trigger("view:add", "graph",  {
  custom_controls: build_custom_controls,
  include: helpers.inputs.TIME_INPUTS
    .concat(helpers.inputs.GROUP_BY)
    .concat(helpers.inputs.LIMIT),
  icon: "noun/pin.svg"
}, GraphView);

module.exports = GraphView;
