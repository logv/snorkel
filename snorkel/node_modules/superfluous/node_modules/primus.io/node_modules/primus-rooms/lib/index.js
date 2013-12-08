/**
 * Module dependencies.
 */

var debug = require('debug')('primus-rooms:spark')
  , Adapter = require('./adapter')
  , Rooms = require('./rooms');

/**
 * Export the `PrimusRooms` method.
 */

module.exports = PrimusRooms;

/**
 * This method initialize PrimusEmitter on primus instance.
 *
 * @param {Primus} primus Primus instance.
 * @param {Object} options The options.
 * @api public
 */

function PrimusRooms(primus, options) {

  options = options || {};

  // caching primus write method
  var write = primus.write;

  // getting rooms instance
  primus._rooms = new Rooms(options.adapter);

  // Extending primus.Spark
  PrimusRooms.Spark(primus.Spark);

  /**
   * Sets the adapter for rooms.
   *
   * @param {Adapter} adapter
   * @return {Primus|Adapter} self when setting or value when getting
   * @api public
   */

  primus.adapter = function adapter(engine) {
    var rooms = primus._rooms;
    var result = rooms.adapter.apply(rooms, arguments);
    return arguments.length ? primus : result;
  };

  /**
   * Join a client to a room.
   *
   * @param {Spark} spark
   * @param {String|Array} room
   * @param {Function} fn callback
   * @return {Primus} self
   * @api public
   */

  primus.join = function join(spark, room, fn) {
    primus._rooms.join(spark, room, fn);
    return primus;
  };

  /**
   * Remove client from a room.
   *
   * @param {Spark} spark
   * @param {String|Array} room
   * @param {Function} fn callback
   * @return {Primus} self
   * @api public
   */

  primus.leave = function leave(spark, room, fn) {
    primus._rooms.leave(spark, room, fn);
    return primus;
  };

  /**
   * Targets a room when broadcasting.
   *
   * @param {String} name
   * @return {Primus}
   * @api public
   */

  primus.in =
  primus.room = function room(name) {
    return primus._rooms.room(primus, name);
  };

  /**
   * Set exception ids when brodcasting.
   *
   * @param {String|Array} ids
   * @return {Primus}
   * @api public
   */

  primus.except = function except(ids) {
    return primus._rooms.except(primus, ids);
  };

  /**
   * Get connected clients.
   *
   * @param {Function} fn callback
   * @return {Primus} self
   * @api public
   */

  primus.clients = function clients(fn) {
    return primus._rooms.clients(primus, fn);
  };

  /**
   * Get all rooms for a client or if no argument is passed
   * get all current rooms on the server.
   *
   * @param {Spark} spark
   * @return {Array} array of rooms
   * @api public
   */

  primus.rooms = function rooms(spark, fn) {
    return primus._rooms.rooms.apply(primus._rooms, arguments);
  };

  /**
   * Check if a specific room is empty.
   *
   * @param {String} [room]
   * @return {Boolean}
   * @api public
   */

  primus.isRoomEmpty = function isRoomEmpty(room) {
    return primus._rooms.isRoomEmpty(room || primus);
  };

  /**
   * Broadcast message to all connections or clients in a room.
   *
   * @param {Mixed} data The data you want to send.
   * @api public
   */

  primus.write = function writer(data) {
    var sparks = primus.connections;
    return primus._rooms.broadcast(primus, [data], sparks, null, 'write') ?
    true : write.call(primus, data);
  };

  return primus;
}

/**
 * Extend a Spark to add Rooms capabilities.
 * 
 * @return {Spark} It returns a primus.Spark
 * @api public
 */

PrimusRooms.Spark = function RoomsSpark(Spark) {

  /**
   * `Spark#initialise` reference.
   */

  var init = Spark.prototype.initialise;

  /**
   * `Spark#write` reference.
   */

  var write = Spark.prototype.write;

  /**
   * Adding reference to Rooms.
   */

  Spark.prototype.Rooms = Rooms;

  /**
   * Attach hooks and automatically announce a new connection.
   *
   * @api private
   */

  Spark.prototype.initialise = function initialise() {
    this._rooms = [];
    this.once('end', this.leaveAll);
    init.apply(this, arguments);
  };

  /**
   * Send a message.
   *
   * @param {Mixed} data The data that needs to be written.
   * @returns {Boolean} Always returns true.
   * @api public
   */

  Spark.prototype.write = function writing(data) {
    var sparks = this.primus.connections;
    return this.primus._rooms.broadcast(this, [data], sparks, [this.id], 'write') ?
    true : write.call(this, data);
  };

  /**
   * Copy room methods to Spark prototype.
   */

  ['in', 'room', 'rooms', 'join', 'leave', 'leaveAll', 'clients', 'except', 'isRoomEmpty']
  .forEach(function each(fn) {
    Spark.prototype[fn] = function () {
      var args = [].slice.call(arguments);
      var rooms = this.primus._rooms;
      return rooms[fn].apply(rooms, [this].concat(args));
    };
  });

  return Spark;
};

// Expose `Rooms` and `Adapter` 
PrimusRooms.Rooms = Rooms;
PrimusRooms.Adapter = Adapter;
