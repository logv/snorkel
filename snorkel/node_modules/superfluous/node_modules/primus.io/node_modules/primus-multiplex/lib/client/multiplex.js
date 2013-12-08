/**
 * Exports `multiplex`.
 */

module.exports = function multiplex(Spark) {

  'use strict';

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
    this.conn = primus;
    this.channels = {};
    this.reconnect = false;
    if (this.conn) this.bind();
  }

  /**
   * Message packets.
   */

  Multiplex.prototype.packets = {
    MESSAGE: 0,
    SUBSCRIBE: 1,
    UNSUBSCRIBE: 2
  };

  /**
   * Bind `Multiplex` events.
   *
   * @return {Multiplex} self
   * @api private
   */

  Multiplex.prototype.bind = function bind() {
    var mp = this;
    this.conn.on('data', function ondata(data) {
      if (isArray(data)) {
        var type = data.shift()
          , id = data.shift()
          , name = data.shift()
          , payload = data.shift()
          , channel = mp.channels[name][id];

        if (!channel) return false;

        switch (type) {
          case mp.packets.MESSAGE:
            channel.emit('data', payload);
            break;
          case mp.packets.UNSUBSCRIBE:
              channel.emit('end');
              channel.removeAllListeners();
              delete mp.channels[name][id];
            break;
        }
        return false;
      }
    });

    return this;
  };

  /**
   * Return a `Channel` instance.
   *
   * @param {String} name The channel name.
   * @return {Spark}
   * @api public
   */

  Multiplex.prototype.channel = function channel(name) {
    if (!name) return this.conn;

    // extend Spark to use emitter if this
    // the plugin its present.
    if ('emitter' in Primus.$) {
      Primus.$.emitter.spark(Spark, Primus.$.emitter.emitter());
    }

    var spark = new Spark(this, name);
    var id = spark.id;
    this.channels[name] =
    this.channels[name] || {};
    this.channels[name][id] = spark;
    return spark;
  };

  /**
   * Check if object is an array.
   */

  function isArray(obj) {
    return '[object Array]' === Object.prototype.toString.call(obj);
  }

  return Multiplex;
}