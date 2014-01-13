/**
 * Module dependencies.
 */

var http = require('http')
  , statusCodes = http.STATUS_CODES;

/**
 * Redirect to the given `url` with optional response `status`
 * defaulting to 302.
 *
 * Examples:
 *
 *    res.redirect('http://example.com');
 *    res.redirect(301, 'http://example.com');
 *
 * @param {Number} code
 * @param {String} url
 * @api public
 */

exports = module.exports = function(url){
  var status = 302;

  // allow status / url
  if (2 == arguments.length) {
    status = url;
    url = arguments[1];
  }

  // Respond
  this.statusCode = status;
  this.setHeader('Location', url);
  this.setHeader('Content-Length', '0');
  this.end();
};
