exports.createPackage = createPackage;
exports.create = createPackage;
function createPackage(ident) {
  return new Package(ident);
}

exports.Package = Package;
function Package(ident) {
  if (!ident.isTopLevel()) {
    throw new TypeError('Invalid package identifier: ' + identifier);
  }

  this.identifier = ident;
  this.id = ident.toString();
}

(function(p) {
  p.searchPath = null;
  p.fullPath = null;
  p.relativePath = null;
  p.descriptorFile = null;
  p.descriptorFileData = null;
  p.lib = null;
  p.main = null;
  p.paths = null;
  p.extensions = null;
  p.allowDirModules = false
  p._modules = null;

  p.setDescriptorFileData = setDescriptorFileData;
  function setDescriptorFileData(data) {
    this.descriptorFileData = data;
    var directories = data && data.directories,
        custom = data && data.modulr;

    this.lib = (directories && directories.lib) || './lib';
    this.main = data.main || './index';

    if (custom) {
      this.paths = custom.paths || null;
      this.extensions = custom.extensions || null;
      this.allowDirModules = !!custom.allowDirModules;
    }
  }
  
  p.addModule = addModule;
  function addModule(m) {
    var modules = this._modules = this._modules || {},
        id = m.id;
    if (!(id in modules)) { modules[id] = m; }
  }
  
  p.toString = toString;
  function toString() {
    return this.id;
  }
})(Package.prototype);

