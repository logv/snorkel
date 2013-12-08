'use strict';

/**
 * Module dependencies.
 */

var spark = require('./spark')
  , multiplex = require('./multiplex');

/**
 * Plugin client method.
 *
 * @param {Primus} primus The primus instance.
 * @api public
 */

exports.client = function client(primus) {

  // multiplex instance.
  var multiplex = new Primus.$.multiplex.Multiplex(primus);
  
  /**
   * Return a `Channel` instance.
   *
   * @param {String} name The channel name.
   * @return {multiplex.Spark}
   * @api public
   */

  primus.channel = function channel(name) {
    return multiplex.channel(name);
  };
};

/**
 * Source code for plugin library.
 *
 * @type {String}
 * @api public
 */

exports.source = [
  ';(function (Primus, undefined) {',
    spark.toString(),
    multiplex.toString(),
  ' if (undefined === Primus) return;',
  ' var Spark = spark();',
  ' Primus.$ = Primus.$ || {};',
  ' Primus.$.multiplex = {}',
  ' Primus.$.multiplex.spark = spark;',
  ' Primus.$.multiplex.multiplex = multiplex;',
  ' Primus.$.multiplex.Multiplex = multiplex(Spark);',
  '})(Primus);'
].join('\n');

exports.Multiplex = multiplex();
exports.Spark = spark();
