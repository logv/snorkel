/**
 * Code inpired mainly by the socket.io 1.0 adapter
 */

/**
 * Module exports.
 */

module.exports = Adapter;

/**
 * Memory adapter constructor.
 *
 * @param {Server} srv
 * @api public
 */

function Adapter(){
  this.rooms = {};
  this.sids = {};
}

/**
 * Adds a socket from a room.
 *
 * @param {String} socket id
 * @param {String} room name
 * @param {Function} callback
 * @api public
 */

Adapter.prototype.add = function add(id, room, fn) {
  this.sids[id] = this.sids[id] || {};
  this.sids[id][room] = true;
  this.rooms[room] = this.rooms[room] || {};
  this.rooms[room][id] = true;
  if (fn) process.nextTick(fn.bind(null, null));
};

/**
 * Get rooms socket is subscribed to.
 *
 * @param {String} socket id
 * @param {Function} fn callback
 * @api public
 */

Adapter.prototype.get = function get(id, fn) {
  var adapter = this;
  if (fn) process.nextTick(function tick() {
    fn(null, adapter.sids[id] || null);
  });
};

/**
 * Removes a socket from a room.
 *
 * @param {String} socket id
 * @param {String} room name
 * @param {Function} callback
 * @api public
 */

Adapter.prototype.del = function del(id, room, fn) {
  this.sids[id] = this.sids[id] || {};
  this.rooms[room] = this.rooms[room] || {};
  delete this.sids[id][room];
  if (this.rooms[room]) {
    delete this.rooms[room][id];
    if (!Object.keys(this.rooms[room]).length) {
      delete this.rooms[room];
    }
  }
  if (fn) process.nextTick(fn.bind(null, null));
};

/**
 * Removes a socket from all rooms it's joined.
 *
 * @param {String} socket id
 * @api public
 */

Adapter.prototype.delAll = function delAll(id) {
  var room, rooms = this.sids[id];
  if (rooms) {
    for (room in rooms) {
      this.del(id, room);
    }
  }
  delete this.sids[id];
};

/**
 * Broadcasts a packet.
 *
 * Options:
 *  - `except` {Array} sids that should be excluded
 *  - `rooms` {Array} list of rooms to broadcast to
 *  - `method` {String} 'write' or 'send' if primus-emitter is present
 *
 * @param {Object} data
 * @param {Object} opts
 * @param {Object} clients Connected clients
 * @api public
 */

Adapter.prototype.broadcast = function broadcast(data, opts, clients) {
  opts = opts || {};
  var socket
    , rooms = opts.rooms || []
    , except = opts.except || []
    , method = opts.method || 'write'
    , length = rooms.length
    , ids = {};
  
  if (length) {
    for (var i = 0; i < length; i++) {
      var room = this.rooms[rooms[i]];
      if (!room) continue;
      for (var id in room) {
        if (ids[id] || ~except.indexOf(id)) continue;
        socket = clients[id];
        if (socket) {
          socket[method].apply(socket, data);
          ids[id] = true;
        }
      }
    }
  } else {
    for (var id in this.sids) {
      if (~except.indexOf(id)) continue;
      socket = clients[id];
      if (socket) socket[method].apply(socket, data);
    }
  }
};

/**
 * Get client ids connected to this room.
 *
 * @param {String} room
 * @param {Function} callback
 * @param {Array} clients
 * @api public
 */

Adapter.prototype.clients = function clients(room, fn) {
  var _room = this.rooms[room]
    , clients = _room ? Object.keys(_room) : [];
  if (fn) process.nextTick(function tick() {
    fn(null, clients);
  });
  return clients;
};
