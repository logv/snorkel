exports.Identifier = Identifier;
function Identifier(terms) {
  if (typeof terms == 'string') {
    terms = terms.split('/');
  }
  this.terms = terms.filter(function(t) { return t; });
}

(function(p) {
  var TERM_REGEXP = /^([a-zA-Z0-9-_$]+|\.\.?)$/;

  p.isValid = isValid;
  function isValid() {
    return this.terms.every(_isTermValid);
  }

  function _isTermValid(term) {
    return TERM_REGEXP.test(term);
  }

  p.resolve = resolve;
  function resolve(otherIdentifier, isDir) {
    if (this.isTopLevel()) {
      return this.clone();
    }

    var otherTerms = otherIdentifier ? otherIdentifier.getDirTerms(isDir) : [],
        terms = this.resolveTerms(otherTerms);
    return createIdentifier(terms);
  }

  p.resolveTerms = resolveTerms;
  function resolveTerms(terms) {
    var output = [], term;
    if (terms && this.isRelative()) {
      terms = terms.slice(0);
    } else {
      terms = [];
    }
    terms.push.apply(terms, this.terms);
    for (var i = 0, length = terms.length; i < length; i++) {
      term = terms[i];
      switch (term) {
        case '':
        case '.':
          continue;
        case '..':
          if (output.length) {
            output.pop();
          } else {
            throw new RangeError('Out of bounds identifier: ' + this);
          }
          break;
        default:
          output.push(term);
      }
    }
    return output;
  }

  p.isRelative = isRelative;
  function isRelative() {
    return (/^\.\.?$/).test(this.terms[0]);
  }

  p.isTopLevel = isTopLevel;
  function isTopLevel() {
    return !this.isRelative();
  }

  p.toArray = toArray;
  function toArray() {
    return this.terms.slice(0);
  }

  p.clone = clone;
  function clone() {
    return createIdentifier(this.toArray());
  }

  p.getDirTerms = getDirTerms;
  function getDirTerms(isDir) {
    var terms = this.terms,
        length = isDir ? terms.length : terms.length - 1;
    return terms.slice(0, length);
  }

  p.toString = toString;
  function toString() {
    return this.terms.join('/');
  }
})(Identifier.prototype);

exports.createIdentifier = createIdentifier;
exports.create = createIdentifier;
function createIdentifier(terms) {
  return new Identifier(terms);
}

exports.fromDirIdentifier = fromDirIdentifier;
function fromDirIdentifier(ident) {
  var terms = ident.toArray();
  terms.push('index');
  return createIdentifier(terms);
}