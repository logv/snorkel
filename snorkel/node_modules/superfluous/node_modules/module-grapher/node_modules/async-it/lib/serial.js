exports.forEach = forEach;
function forEach(iterable, iterator, context, callback) {
  var i = 0, 
      length = iterable.length;
  
  if (!callback) {
    callback = context;
    context = null;
  }
  
  function cont(err) {
    if (err) {
      callback(err);
    } else if (i == length) {
      callback(null, iterable);
    } else if (i in iterable) {
      iterator.call(context, iterable[i++], cont);
    } else {
      i++;
      cont();
    }
  }
  
  process.nextTick(cont);
}

exports.forEachWithIndex = forEachWithIndex;
function forEachWithIndex(iterable, iterator, context, callback) {
  var i = 0, 
      length = iterable.length;
  
  if (!callback) {
    callback = context;
    context = null;
  }
  
  function cont(err) {
    if (err) {
      callback(err);
    } else if (i == length) {
      callback(null, iterable);
    } else if (i in iterable) {
      var item = iterable[i];
      iterator.call(context, item, i++, cont);
    } else {
      i++;
      cont();
    }
  }
  
  process.nextTick(cont);
}

exports.map = map;
function map(iterable, iterator, context, callback) {
  var i = 0, 
      length = iterable.length,
      output = [];
  
  if (!callback) {
    callback = context;
    context = null;
  }
  
  function cont(err, result) {
    output.push(result);
    err ? callback(err) : run();
  }
  
  function run() {
    if (i == length) {
      callback(null, output);
    } else if (i in iterable) {
      iterator.call(context, iterable[i++], cont);
    } else {
      i++;
      cont();
    }
  }
  
  process.nextTick(run);
}

exports.every = every;
function every(iterable, iterator, context, callback) {
  var i = 0, 
      length = iterable.length;
  
  if (!callback) {
    callback = context;
    context = null;
  }

  function cont(err, result) {
    if (err) {
      callback(err);
    } else if (!result) {
      callback(null, false);
    } else {
      run();
    }
  }

  function run() {
    if (i == length) {
      callback(null, true);
    } else if (i in iterable) {
      iterator.call(context, iterable[i++], cont);
    } else {
      i++;
      cont();
    }
  }

  process.nextTick(run);
}

exports.some = some;
function some(iterable, iterator, context, callback) {
  var i = 0, 
      length = iterable.length;
  
  if (!callback) {
    callback = context;
    context = null;
  }

  function cont(err, result) {
    if (err) {
      callback(err);
    } else if (result) {
      callback(null, true);
    } else {
      run();
    }
  }

  function run() {
    if (i == length) {
      callback(null, false);
    } else if (i in iterable) {
      iterator.call(context, iterable[i++], cont);
    } else {
      i++;
      cont();
    }
  }

  process.nextTick(run);
}

exports.filter = filter;
function filter(iterable, iterator, context, callback) {
  var i = 0, 
      length = iterable.length,
      output = [];
  
  if (!callback) {
    callback = context;
    context = null;
  }
  
  function cont(err, result) {
    var item = iterable[i];
    if (result) { output.push(item); }
    err ? callback(err) : run();
  }
  
  function run() {
    if (i == length) {
      callback(null, output);
    } else if (i in iterable) {
      i++;
      iterator.call(context, item, cont);
    } else {
      i++;
      cont();
    }
  }
  process.nextTick(run);
}

exports.reduce = reduce;
function reduce(iterable, iterator, initialValue, callback) {
  throw new Error('function "reduce" is not implemented yet.');
}

exports.reduceRight = reduceRight;
function reduceRight(iterable, iterator, initialValue, callback) {
  throw new Error('function "reduceRight" is not implemented yet.');
}
