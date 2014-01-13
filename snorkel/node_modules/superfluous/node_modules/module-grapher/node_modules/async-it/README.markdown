async-it
========

`async-it` is a series of **generic asynchronous parallel and serial iterators**
for node.js.

These iterators are based on the ES5 additions to `Array` (`forEach`, `map`,
`filter`, `some`, `any`, `reduce` and `reduceRight`). `reduce` and `reduceRight`
are available in serial mode only.

Indexes are only passed to the callback in the aptly-named `forEachWithIndex` for fear of
crowding the callback with little used arguments.

Like their sync counterparts, these iterators work on any object which has a numeric
length property.

Usage
-----
    
See `examples/example.js`:

    var path = require('path'),
        fs = require('fs'),
        asyncItParallel = require('async-it').parallel;

    var files = ['foo.txt', 'bar.txt', 'does-not-exist.txt', 'baz.txt'];
    files = files.map(function(file) {
      return path.join(__dirname, 'files', file);
    });

    // select existing files
    asyncItParallel.filter(files, function(file, cont) {
      path.exists(file, function(exists) {
        cont(null, exists);
      });
    }, function(err, existingFiles) {
      // collect their content
      asyncItParallel.map(existingFiles, function(file, cont) {
        fs.readFile(file, 'utf8', cont);
      }, function(err, content) {
        // output the ordered content to the console
        console.log(content.join('\n'));
      });
    });

    // Hi, I'm foo!
    // Hello World, this is bar.
    // I'm baz.

License
-------

Licensed under the [MIT license][1], Copyright 2010 Tobie Langel.

[1]: http://github.com/tobie/async-it/raw/master/LICENSE

