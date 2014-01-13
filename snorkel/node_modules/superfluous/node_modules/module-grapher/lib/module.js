var crypto = require('crypto');

function digest(str) {
  var hash = crypto.createHash('md5');
  hash.update(str);
  return hash.digest('hex');
}

exports.createModule = createModule;
exports.create = createModule;
function createModule(ident) {
  return new Module(ident);
}

exports.Module = Module;
function Module(ident) {
  this.setIdentifier(ident);
}

(function(p) {
  p.missing = false;
  p._dependencies = null;
  p._directDependencies = null;
  p._requirers = null;
  p.lastRequiredBy = null;
  p._hashCode = null;
  p.raw = '';
  p._src = '';
  p.ast = null;
  p.searchPath = null;
  p.fullPath = null;
  p.relativePath = null;
  p.ext = null;
  p.mtime = null;
  p._size = 0;
  p._totalSize = 0;
  p._totalLoc = 0;
  p._totalSloc = 0;
  p._isDir = false;
  p.duplicateOf = null;
  p._duplicates = null;
  p.dirModule = null;
  p.indexModule = null;

  p.setIdentifier = setIdentifier;
  function setIdentifier(identifier) {
    if (!identifier.isTopLevel()) {
      throw new TypeError('Cannot instantiate Module from unresolved identifier: ' + identifier);
    }

    this.identifier = identifier;
    this.id = identifier.toString();
  }

  p.resolveIdentifier = resolveIdentifier;
  function resolveIdentifier(identifier) {
    return identifier.resolve(this.identifier, this._isDir);
  }

  p.getHashCode = getHashCode;
  function getHashCode() {
    if (!this._hashCode) {
      this._hashCode = digest(this.raw);
    }
    return this._hashCode
  }

  p.compile = compile;
  function compile(compiler) {
    this._src = compiler.compile(this.raw);
  }

  p.parseSrc = parseSrc;
  function parseSrc(parser, isDir) {
    var result = parser.parse(this.getSrc(), this, isDir);
    this.ast = result.ast;
    return result;
  }

  p.getSrc = getSrc;
  function getSrc() {
    if (this.indexModule) {
      return 'module.exports = require("' + this.indexModule.id + '");';
    }
    return this._src ? this._src : this.raw;
  }

  p.resolve = resolve;
  function resolve(resolver, callback) {
    var self = this;
    if (resolver && this._resolver === resolver) {
      process.nextTick(function() {
        callback(null, self._isDir);
      });
    } else {
      this._resolver = resolver;
      resolver.resolveModule(this, function(err, isDir) {
        self._isDir = isDir;
        callback(err, isDir);
      });
    }
  }

  p.addDependency = addDependency;
  function addDependency(m) {
    var id = m.id,
        deps = this.getDirectDependencies();
    if (!(id in deps)) {
      deps[id] = m;
      m.addRequirer(this);
    }
  }

  p.clearDependencies = clearDependencies;
  function clearDependencies() {
    this._directDependencies = null;
    this._dependencies = null;
  }

  p.addRequirer = addRequirer;
  function addRequirer(m) {
    var id = m.id,
        reqs = this.getRequirers();
    if (!(id in reqs)) { reqs[id] = m; }
    this.lastRequiredBy = m;
  }

  p.clearRequirers = clearRequirers;
  function clearRequirers() {
    this._requirers = null;
    this.lastRequiredBy = null;
  }

  p.getDirectDependencies = getDirectDependencies;
  function getDirectDependencies() {
    return (this._directDependencies = this._directDependencies || {});
  }

  p.getDependencies = getDependencies;
  function getDependencies() {
    if (!this._dependencies) {
      var deps = this._dependencies = {},
          stack = [this],
          children,
          child,
          m;

      while (stack.length) {
        m = stack.pop();
        children = m.getDirectDependencies();

        for (var id in children) {
          if (!(id in deps)) {
            child = children[id];
            deps[id] = child;
            stack.push(child);
          }
        }
      }
    }
    return this._dependencies;
  }

  p.pointTo = pointTo;
  function pointTo(m) {
    this.markAsDuplicateOf(m);
    this.clearDependencies();
    this.addDependency(m);
    m.dirModule = this;
    this.indexModule = m;
    this._isDir = true;
    m._isDir = false;
  }

  p.markAsDuplicateOf = markAsDuplicateOf;
  function markAsDuplicateOf(m) {
    if (this._duplicates) {
      // Transfer duplicates to master
      var dups = this.getDuplicates();
      for (var id in dups) {
        m.addDuplicate(dups[id]);
      }
      // Remove them.
      this._duplicates = null;
    }
    m.addDuplicate(this);
  }

  p.addDuplicate = addDuplicate;
  function addDuplicate(m) {
    var id = m.id,
        dups = this.getDuplicates();
    if (!(id in dups)) {
      dups[id] = m;
      m.duplicateOf = this;
    }
  }

  p.getDuplicates = getDuplicates;
  function getDuplicates() {
    return (this._duplicates = this._duplicates || {});
  }

  p.isEqual = isEqual;
  function isEqual(m) {
    return this.raw === m.raw;
  }

  p.clone = clone;
  function clone() {
    var clone = createModule(this.identifier);

    for (var prop in this) {
      clone[prop] = this[prop];
    }

    // shallow clone referenced objects.
    clone._dependencies = _cloneObj(this._dependencies);
    clone._directDependencies = _cloneObj(this._directDependencies);
    clone._requirers = _cloneObj(this._requirers);

    return clone;
  }

  function _cloneObj(obj) {
    if (!obj) { return obj; }
    var clone = {};
    for (var prop in obj) {
      clone[prop] = obj[prop];
    }
    return clone;
  }

  p.getRequirers = getRequirers;
  function getRequirers() {
    return (this._requirers = this._requirers || {});
  }

  p.getSize = getSize;
  function getSize() {
    return (this._size = this._size || Buffer.byteLength(this.getSrc()));
  }

  p.getLoc = getLoc;
  function getLoc() {
    return this.raw.split('\n').length;
  }

  p.getSloc = getSloc;
  function getSloc() {
    return this.raw.split(/\n\s*/).length;
  }

  p.getTotalSize = _makeSummingMethod('Size');
  p.getTotalLoc = _makeSummingMethod('Loc');
  p.getTotalSloc = _makeSummingMethod('Sloc');

  function _makeSummingMethod(prop) {
    var cacheName = '_total' + prop,
        methodName = 'get' + prop;

    return function() {
      if (!this[cacheName]) {
        var sum = this[methodName](),
            deps = this.getDependencies();

        for (var id in deps) {
          sum += deps[id][methodName]();
        }

        this[cacheName] = sum;
      }
      return this[cacheName];
    }
  }

  p.toString = toString;
  function toString() {
    return this.id;
  }
})(Module.prototype);

