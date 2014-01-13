// Marks duplicates.
// Avoids nested structures: defines one master and the rest
// as slaves.
// Makes sure the same module is always picked as master.
 
exports.markDuplicates = markDuplicates;
function markDuplicates(modules) {
  _findDuplicates(modules).forEach(_markMasterAndSlaves);
}

// Accepts modules, returns a nested array of duplicates.
exports._findDuplicates = _findDuplicates;
function _findDuplicates(modules) {
  var keys = Object.keys(modules),
      output = [],
      m,
      index,
      dup,
      dups;

  while (keys.length) {
    m = modules[keys.shift()];
    index = 0;
    dups = null;

    while (index < keys.length) {
      dup = modules[keys[index]];
      if (m.isEqual(dup)) {
        if (!dups) {
          dups = [m];
          output.push(dups);
        }
        dups.push(dup);
        // remove duplicate modules
        keys.splice(index, 1);
      } else {
        index++;
      }
    }
  }
  return output;
}

// Accepts a array of duplicates, identifies the master
// and marks each module as master or slave.
function _markMasterAndSlaves(modules) {
  modules.sort(function(a, b) {
    a = a.id;
    b = b.id;
    var output = a.length - b.length;
    if (output === 0) {
      return a > b ? 1 : -1;
    }
    return output;
  });

  var selected, m;
  for (var i = 0; i < modules.length; i++) {
    m = modules[i];
    if (!m.indexModule) {
      selected = m;
      selected.duplicateOf = null;
      modules.splice(i, 1);
      break;
    }
  }

  for (var i = 0; i < modules.length; i++) {
    modules[i].markAsDuplicateOf(selected);
  }
}