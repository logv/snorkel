/**
 * Module dependencies.
 */

var multiplex = require('./lib');

/**
 * Exporting modules.
 */

exports.library = multiplex.client.source;
exports.client = multiplex.client.client;
exports.server = multiplex.server.server;
exports.multiplex = multiplex;