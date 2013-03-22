"use strict";

var compare_data = {};
var results_data = {};
var timestamps = {};

var acks = {};
var identities = {};
var uris = {};

function ResultsStore() { }

ResultsStore.set_timestamp = function(id, timestamp) {
  timestamps[id] = timestamp;
};

ResultsStore.get_timestamp = function(id) {
  return timestamps[id] || Date.now();
};

ResultsStore.add_results_data = function(data) {
  if (!data) { return; }
  results_data[data.parsed.id] = data;

};

ResultsStore.add_compare_data = function(data) {
  if (!data) { return; }
  compare_data[data.parsed.id] = data;
};

ResultsStore.get_compare_data = function(id) {
  return compare_data[id];
};

ResultsStore.get_results_data = function(id) {
  return results_data[id];
};

ResultsStore.handle_ack = function(data) {
  acks[data.id] = data;
  var form_str = _.map(data.input, function(f) { return f.name + "=" + f.value; }).join('&');
  uris[form_str] = data.id;
};

ResultsStore.identify = function(data) {
  if (acks[data.client_id]) {
    acks[data.client_id].server_id = data.server_id;
  }
  
  identities[data.client_id] = data.server_id;
};

ResultsStore.to_server = function(client_id) {
  return identities[client_id];
};

module.exports = ResultsStore;
