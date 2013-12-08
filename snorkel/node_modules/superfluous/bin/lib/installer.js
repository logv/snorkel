"use strict";

var program = require("commander");

var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var exec = require('child_process').exec;

var base_dir = path.join(__dirname,  "..", "default");
var cwd = process.cwd();

// Have to look inside top levels for routes.json file
function get_app_dir() {
  var resolved = cwd;

  if (program.dir) {
    resolved = path.resolve(cwd, program.dir);
  }

  var links = 100;
  while (resolved !== '/' && links > 0) {
    if (fs.existsSync(path.join(resolved, "routes.json"))) {
      return resolved;
    }
    resolved = path.resolve(resolved, "..");
    links -= 1;
  }

  return;
}

function create_superfluous_app(app_name) {
  console.log(app_name, typeof app_name);
  if (typeof app_name !== "string") {
    console.log("You should specify an app name: superfluous create <app>");
    return;
  }

  // First check to see if current dir is a superfluous app
  var app_dir = get_app_dir();
  var dest_dir = path.resolve(cwd, app_name);

  // if it is, throw an error. Easy way is to look for routes.json file
  if (app_dir) {
    console.log(program.dir, "is already a superfluous app!");
  } else {
    console.log("Initializing a new superfluous app in", app_name);
    fse.copy(base_dir, dest_dir, function(err) {
      if (err) {
        console.log(err);
      } else {
        console.log("Linking superfluous bundle into node_modules");
        exec("npm link superfluous", { cwd: dest_dir });
        console.log("Updating app variables in", dest_dir);
        var cmd = "sed -i 's/APPNAME/" + app_name + "/g' package.json";
        exec(cmd, { cwd: dest_dir });
        // Linking 
      }
    });
  }
}

module.exports = {
  run: function() {
    program
      .version('0.0.1');

    program
      .command('create')
      .description('create a new superfluous app')
      .action(create_superfluous_app);

    program.parse(process.argv);

  }
};
