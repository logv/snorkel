/**
 * Module dependencies.
 */

var rooms = require('./lib');

/**
 * Export `PrimusRooms`.
 */

module.exports = PrimusRooms;

/**
 * Constructor.
 *
 * @param {Primus} primus The primus instance.
 * @api public
 */

function PrimusRooms(primus, options) {
  primus.$ = primus.$ || {};
  primus.$.rooms = {};
  primus.$.rooms.rooms = rooms;
  primus.$.rooms.Adapter = rooms.Adapter;
  primus.$.rooms.Rooms = rooms.Rooms;
  rooms(primus, options);
}

/**
 * Expose server.
 */

PrimusRooms.server = PrimusRooms;

/**
 * Expose `Adapter` object.
 */

PrimusRooms.Adapter = rooms.Adapter;

/**
 * Expose `Rooms` object.
 */

PrimusRooms.Rooms = rooms.Rooms;
