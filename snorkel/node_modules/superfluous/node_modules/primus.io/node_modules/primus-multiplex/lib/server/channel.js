/**
 * Module dependenceies.
 */

var Spark = require('./spark')
  , Emitter = require('events').EventEmitter;

/**
 * Expoport `Channel` module.
 */

module.exports = Channel;

/**
 * `Channel` constructor.
 *
 * @constructor
 * @param {Multiplex} mp Multiplex object.
 * @param {String} name Channel name.
 * @api public
 */

function Channel(mp, name) {
  if (!(this instanceof Channel)) return new Channel(mp, name);
  this.mp = mp;
  this.name = name;
  this.connections = {};
  this.initialise();
}

/**
 * Inherits from `EventEmitter`.
 */

Channel.prototype.__proto__ = Emitter.prototype;

/**
 * Initialise the `Channel`.
 *
 * @return {Channel} self.
 * @api private
 */

Channel.prototype.initialise = function initialise() {

  var chnl = this
    , primus = this.mp.primus
    , adapter = this.mp.adapter
    , PrimusRooms = this.PrimusRooms;

  if ('rooms' in primus.$) {
    this._rooms = new primus.$.rooms.Rooms();
    this.adapter(adapter || new primus.$.rooms.Adapter());
  }

  if ('emitter' in primus.$) {
    primus.$.emitter.spark(Spark, primus.$.emitter.emitter());
  }

  // Create a pre-bound Spark constructor.
  this.Spark = function Sparky(conn, id) {
    return Spark.call(this, chnl, conn, id);
  };

  this.Spark.prototype = Object.create(Spark.prototype, {
    constructor: {
      value: this.Spark,
      writable: true,
      enumerable: false,
      configurable: true
    }
  });

  return this;
};

/**
 * Emit incoming message on specific `spark`.
 *
 * @param {String|Number} id The connection id.
 * @param {Mixed} data The message that needs to be written.
 * @return {Channel} self.
 * @api private
 */

Channel.prototype.message = function message(id, data) {
  var spark = this.connections[id];
  if (spark) process.nextTick(function tick() {
    spark.emit('data', data);
  });
  return this;
};

/**
 * Subscribe a connection to this `channel`.
 *
 * @param {primus.Spark} conn The incoming connection object.
 * @param {String|Number} id, The connection id.
 * @return {Channel} self.
 * @api private
 */

Channel.prototype.subscribe = function subscribe(conn, id) {
  if (this.connections[id]) return this;
  var spark = new this.Spark(conn, id);
  this.connections[spark.id] = spark;
  conn.channels[this.name] = conn.channels[this.name] || [];
  conn.channels[this.name].push(spark.id);
  return this;
};

/**
 * Unsubscribe a connection from this `channel`.
 *
 * @param {String|Number} id The connection id.
 * @return {Channel} self.
 * @api private
 */

Channel.prototype.unsubscribe = function unsubscribe(id, ignore) {
  var spark = this.connections[id];
  if (spark) {
    if (!ignore) spark.end();
    delete this.connections[id];
  }
  return this;
};

/**
 * Iterate over the connections.
 *
 * @param {Function} fn The function that is called every iteration.
 * @api public
 */

Channel.prototype.forEach = function forEach(fn) {
  for (var id in this.connections) {
    fn(this.connections[id], id, this.connections);
  }
  return this;
};

/**
 * Broadcast the message to all connections.
 *
 * @param {Mixed} data The data you want to send.
 * @api public
 */

Channel.prototype.write = function write(data) {
  var result
  if (this._rooms) {
    result = this._rooms.broadcast(this, [data], this.connections);
  }
  return result ? result : this.forEach(function each(spark) {
    spark.write(data);
  });
};

/**
 * Broadcast the message to all connections.
 *
 * @param {String} ev The event.
 * @param {Mixed} [data] The data to broadcast.
 * @param {Function} [fn] The callback function.
 * @api public
 */

Channel.prototype.send = function send(ev, data, fn) {
  if (!this.mp.primus.$.emitter) return this.write(ev);

  var result, args = arguments;

  if (this._rooms) {
    result = this._rooms.broadcast(this, args, this.connections, null, 'send');
  }

  return result ? result : this.forEach(function each(spark) {
    spark.send.apply(spark, args);
  });
};

/**
 * Join a client to a room, for PrimusRooms only.
 *
 * @param {Spark} spark
 * @param {String|Array} room
 * @param {Function} fn callback
 * @return {Channel} self
 * @api public
 */

Channel.prototype.join = function join(spark, room, fn) {
  this._rooms.join(spark, room, fn);
  return this;
};

/**
 * Remove client from a room, for PrimusRooms only.
 *
 * @param {Spark} spark
 * @param {String|Array} room
 * @param {Function} fn callback
 * @return {Channel} self
 * @api public
 */

Channel.prototype.leave = function leave(spark, room, fn) {
  this._rooms.leave(spark, room, fn);
  return this;
};

/**
 * Targets a room when broadcasting, for PrimusRooms only.
 *
 * @param {String} name
 * @return {Channel}
 * @api public
 */

Channel.prototype.in =
Channel.prototype.room = function room(name) {
  if (!this._rooms) return this;
  return this._rooms.room(this, name);
};

/**
 * Set exception ids when brodcasting.
 *
 * @param {String|Array} ids
 * @return {Channel}
 * @api public
 */

Channel.prototype.except = function except(ids) {
  return this._rooms.except(this, ids);
};

/**
 * Get connected clients, for PrimusRooms only.
 *
 * @param {Function} fn callback
 * @return {Channel|Array} self or array of client ids
 * @api public
 */

Channel.prototype.clients = function clients(fn) {
  return this._rooms.clients(this, fn);
};

/**
 * Get all rooms for a client or if no argument is passed
 * get all current rooms on the server.
 *
 * @param {Spark} spark
 * @return {Array} array of rooms
 * @api public
 */

Channel.prototype.rooms = function rooms(spark, fn) {
  return this._rooms.rooms.apply(this._rooms, arguments);
};

/**
 * Check if a specific room is empty.
 *
 * @param {String} [room]
 * @return {Boolean}
 * @api public
 */

Channel.prototype.isRoomEmpty = function isRoomEmpty(room) {
  return this._rooms.isRoomEmpty(room || this);
};

/**
 * Destroy this `Channel` instance.
 *
 * @param {Function} fn Callback.
 * @api public
 */

Channel.prototype.destroy = function destroy(fn) {
  this.forEach(function each(spark){
    spark.end();
  });

  this.sparks = 0;
  this.connections = {};
  this.emit('close');
  this.removeAllListeners();

  if ('function' === typeof fn) fn();
  return this;
};

/**
 * Set an adapter for `primus-rooms` only.
 *
 * @param {Adapter} adapter
 * @return {Channel|Adapter} self when setting or value when getting
 * @api private
 */

Channel.prototype.adapter = function adapter() {
  var rooms = this._rooms;
  var result = rooms.adapter.apply(rooms, arguments);
  return arguments.length ? this : result;
};

/**
 * Encode data to return a multiplex packet.
 *
 * @param {Number} type
 * @param {Object} data
 * @return {Object} packet
 * @api private
 */

Channel.prototype.packet = function packet(type, id, data) {
  var packet = [type, id, this.name];
  if (data) packet.push(data);
  return packet;
};
