var uglify = require('uglify-js'),
    processor = uglify.uglify,
    parser = uglify.parser;

var _toString = Object.prototype.toString;

exports.createParser = createParser;
exports.create = createParser;
function createParser(config) {
  return new Parser(config);
}

exports.Parser = Parser;
function Parser(config) {
  this.config = config;
  this.walker = processor.ast_walker();
}

(function(p) {
  p.parse = parse;
  function parse(str, file) {
    var results = [],
        walker = this.walker;

    try {
      results.ast = parser.parse(str);
    } catch(err) {
      var se = new SyntaxError(err.message);
      se.file = file;
      se.line = err.line + 1; // fix line count
      se.col = err.col;
      se.pos = err.pos;
      se.longDesc = se.toString() + '\n    at ' + se.file + ':' + se.line + ':' + se.col;
      se.toString = function() { return se.longDesc; };
      throw se;
    }

    function handleExpr(expr, args) {
      if (expr[0] == "name" && expr[1] == "require") {
        results.push(args[0]);
      }
    }

    walker.with_walkers({
      "new": handleExpr,
      "call": handleExpr
    }, function() { return  walker.walk(results.ast); });

    return results;
  }

  p.astToSrcCode = astToSrcCode;
  function astToSrcCode(ast) {
    return processor.gen_code(ast);
  }
})(Parser.prototype);