module.exports = function spark(Spark, Emitter) {

  'use strict';

  // return if this already was extended with Emitter;
  if (Spark.prototype.__Emitter__) return Spark;

  /**
   * `Primus#initialise` reference.
   */

  var initialise = Spark.prototype.initialise;

  /**
   * Adding reference to Emitter.
   */

  Spark.prototype.__Emitter__ = Emitter;

  /**
   * Initialise the Primus and setup all
   * parsers and internal listeners.
   *
   * @api private
   */

  Spark.prototype.initialise = function init() {
    this.emitter = new Emitter(this);
    initialise.apply(this, arguments);
    return this;
  };

  /**
   * Emits to this Spark.
   *
   * @return {Socket} self
   * @api public
   */

  Spark.prototype.send = function send(ev) {
    // ignore newListener event to avoid this error in node 0.8
    // https://github.com/cayasso/primus-emitter/issues/3
    if ('newListener' === ev) return this;
    this.emitter.send.apply(this.emitter, arguments);
    return this;
  };

};