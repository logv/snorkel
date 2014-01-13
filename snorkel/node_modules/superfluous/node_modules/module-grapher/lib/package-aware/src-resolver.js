/*
  When attempting to resolve a particular module, this
  resolver will first look to see if there's a corresponding
  existing package. So for example, when looking for a module
  with id `foo/bar/baz`, the resolver will first check to see
  if there's a package named `foo` in any of the provided
  paths (i.e. it will look for a descriptor file
  "./foo/package.json" in each path).
  
  It will the proceed to look for the relative path to the lib
  directory in the descriptor file's `directories.lib` property,
  defaulting to "./lib" if none is specified (as per the CJS
  spec). So in our previous example, if the corresponding
  descriptor file is found in the search path "./vendor" and
  its `directories.lib` property is "./source/js/", the resolver
  will look for the module here:
  
      ".../vendor/foo/source/js/bar/baz.js"
         '-------''--''--------''------''--'
            |     |       |        |      \--- extensions
         search   |   directories  |
          path    |      lib       |
               package        relative module
                 id               path
  
  Note that it will try the other specified extensions and also
  ".../vendor/foo/js/src/bar/baz/index[.js, etc.]" if the
  relevant option is set to true.
  
  Importantly, this implies package precedence. If you have the
  following search paths array: ["./lib", "./vendor"] and the
  following dir structure:
  
      root/
        '-- lib/
        |    '-- foo/
        |         '-- main.js
        |
        '-- vendor/
             '-- foo/
                  |-- package.json
                  '-- lib/
                       '-- main.js
  
  
  A module with id `foo/main` will point to
  "root/vendor/foo/lib/main.js". This is necessary to maintain
  package integrity. If this is not the behaviour you are
  expecting you should use another package resolver that doesn't
  enforce package precedence, or you should rename non-packages
  so that they do not conflict with packages.
*/

var util = require('util'),
    path = require('path'),
    fs = require('fs'),
    serialize = require('async-it').serial,
    identifier = require('../identifier'),
    pkg = require('./package'),
    SuperClass = require('../src-resolver').SrcResolver,
    _super = SuperClass.prototype;

exports.createSrcResolver = createSrcResolver;
exports.create = createSrcResolver;
function createSrcResolver(config) {
  return new SrcResolver(config);
}

exports.SrcResolver = SrcResolver;
function SrcResolver(config) {
  SuperClass.call(this, config);
  this.packageCache = {};
}

util.inherits(SrcResolver, SuperClass);

(function(p) {
  p.resolve = resolve;
  function resolve(module, callback) {
    var self = this;
    
    this.getPackageForModule(module, function(err, pkg) {
      if (err) {
        callback(err);
      } else if (pkg) {
        // Create the path based on the pkg object.
        var relativePath;
        if (module.id === pkg.id) {
          // For require statement of the form require('foo') we
          // want the package's entry point (`main` property of the
          // pkg object).
          relativePath = path.join(pkg.id, pkg.main);
        } else {
          // The require statement is of the form require('foo/bar/baz') we
          // want the package's lib directory.
          // So if pkg.lib is "./src", relativePath will look like:
          // "foo/src/bar/baz".
          var identifiers = path.join.apply(path, module.identifier.terms.slice(1));
          relativePath = path.join(pkg.id, pkg.lib, identifiers);
        }
        self.resolvePath(relativePath, module, function(err, isDir) {
          if (err) {
            callback(err, isDir);
          } else {
            module.setPackage(pkg);
            callback(null, isDir);
          }
        });
      } else {
        // This module isn't part of a package. Look it up the
        // normal way.
        _super.resolve.call(self, module, callback);
      }
    });
  }
  
  p.getPackageForModule = getPackageForModule;
  function getPackageForModule(module, callback) {
    var self = this,
        id = module.identifier.terms[0],
        packageCache = this.packageCache;

    if (id in packageCache) {
      process.nextTick(function() {
        callback(null, packageCache[id]);
      });
    } else {
      // Iterate over each paths supplied in `config`.
      serialize.forEach(this.paths, function(currentPath, checkNextPath) {
        var p = path.resolve(self.root, currentPath, id),
            descriptorFile = path.join(p, 'package.json');
        fs.readFile(descriptorFile, 'utf8', function(err, data) {
          if (err) {
            // No package.json file, here. Check in next search path.
            checkNextPath();
          } else {
            try {
              data = JSON.parse(data);
            } catch(err) {
              // Malformed package.json file. Exit.
              err.file = descriptorFile;
              err.longDesc = err.toString() + '. Malformed JSON in descriptor file:\n    ' + descriptorFile;
              err.toString = function() { return err.longDesc; };
              callback(err);
              return;
            }
            var ident = identifier.create(id),
                pkgInst = pkg.create(ident);

            pkgInst.searchPath = currentPath;
            pkgInst.fullPath = p;
            pkgInst.relativePath = path.relative(self.root, p);
            pkgInst.descriptorFile = descriptorFile;
            pkgInst.setDescriptorFileData(data);
            packageCache[id] = pkgInst;
            callback(null, pkgInst);
          }
        });
      }, function() {
        // Couldn't find a package descriptor file in 
        // any of the supplied paths. We're not dealing 
        // with a package.
        // Cache it anyway so we avoid the lookup next time.
        packageCache[id] = null;
        callback(null, null);
      });
    }
  }
})(SrcResolver.prototype);