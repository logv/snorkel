/**
 * Module dependencies.
 */

var Channel = require('./channel')
  , Spark = require('./spark')
  , isArray = require('util').isArray;

/**
 * Expoport `Multiplex` module.
 */

module.exports = Multiplex;

/**
 * `Multiplex` constructor.
 *
 * @constructor
 * @param {Primus} primus Primus instance.
 * @param {Object} options The options.
 * @api public
 */

function Multiplex(primus, options) {
  if (!(this instanceof Multiplex)) return new Multiplex(primus, options);

  options = options || {};
  this.primus = primus;
  this.channels = {};

  // Set adapter for rooms. 
  this.adapter = options.adapter;

  // Define the global $ namespace if its
  // not yet defined.
  primus.$ = primus.$ || {};

  // Lets register Multiplex under $
  // as a plugin for other plugins to
  // be aware of it.
  primus.$.multiplex = {};
  primus.$.multiplex.Spark = Spark;
  primus.$.multiplex.Channel = Channel;
  primus.$.multiplex.Multiplex = Multiplex;

  if (this.primus) this.bind();
}

/**
 * Message packets.
 */

Multiplex.prototype.packets = {
  MESSAGE: 0,       // incoming message
  SUBSCRIBE: 1,     // incoming subscriptions
  UNSUBSCRIBE: 2    // incoming unsubscriptions
};

/**
 * Bind `Multiplex` events.
 *
 * @return {Multiplex} self
 * @api private
 */

Multiplex.prototype.bind = function bind(name) {
  var mp = this;
  this.onconnection = this.onconnection.bind(this);
  this.ondisconnection = this.ondisconnection.bind(this);
  this.primus.on('connection', this.onconnection);
  this.primus.on('disconnection', this.ondisconnection);
  this.primus.once('close', this.onclose.bind(this));
  this.primus.channel = function channel(name) {
    return mp.channel(name);
  };
  return this;
};

/**
 * Called upon new connection.
 *
 * @param {primus.Spark} conn
 * @returns {Multiplex} self
 * @api private
 */

Multiplex.prototype.onconnection = function onconnection(conn) {
  var mp = this;
  conn.channels = {};

  conn.on('data', function ondata(data) {

    if (!isArray(data)) return false;

    // Parse data to get required fields.
    var type = data.shift()
      , id = data.shift()
      , name = data.shift()
      , payload = data.shift()
      , channel = mp.channels[escape(name)];

    if (!channel) return false;

    switch (type) {

      case mp.packets.MESSAGE:
        channel.message(id, payload);
        break;

      case mp.packets.SUBSCRIBE:
        channel.subscribe(conn, id);
        break;

      case mp.packets.UNSUBSCRIBE:
        channel.unsubscribe(id);
        break;
    }

    return false;

  });
};

/**
 * Called upon new disconnection.
 *
 * @param {Spark} conn
 * @returns {Multiplex} self
 * @api private
 */

Multiplex.prototype.ondisconnection = function ondisconnection(conn) {
  var chnl, spark;
  for (var name in conn.channels) {
    ids = conn.channels[name];
    if (name in this.channels) {
      chnl = this.channels[name];
      for (var i = 0; i < ids.length; ++i) {
        spark = chnl.connections[ids[i]];
        if (spark) spark.end();
      }
    }
    delete conn.channels[name];
  }
  return this;
};

/**
 * Iterate over the channels.
 *
 * @param {Function} fn The function that is called every iteration.
 * @return {Multiplex} self
 * @api public
 */

Multiplex.prototype.forEach = function forEach(fn) {
  for (var channel in this.channels) {
    fn(this.channels[channel], channel, this.channels);
  }
  this.channels = {};
  return this;
};

/**
 * Called up on main `connection` closed.
 *
 * @return {Multiplex} self
 * @api private
 */

Multiplex.prototype.onclose = function onclose() {
  this.forEach(function each(channel) {
    channel.destroy();
  });
  return this;
};

/**
 * Return a `Channel` instance.
 *
 * @param {String} name The channel name.
 * @return {Channel}
 * @api public
 */

Multiplex.prototype.channel = function channel(name) {
  return this.channels[escape(name)] = new Channel(this, name);
};