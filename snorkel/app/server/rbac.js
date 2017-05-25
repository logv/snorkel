var minimatch = require("minimatch");

// ACL file format is:
// that is alphabetical order and everything is seperated by colons
// group:perm1,perm2:table1,table2,:user1,user2
var config = require_core("server/config");
var readfile = require_core("server/readfile");


function read_perm_line(line) {
  var trimmed = line.trim();
  if (!trimmed || trimmed[0] == "#") {
    return {};
  }

  var tokens = line.split(":");
  var role = tokens[0];
  var perms = tokens[1].split(",");
  var tables = tokens[2].split(",");
  var users = tokens[3].split(",");

  return {
    role: role,
    line: line,
    users: users,
    tables: tables,
    perms: perms,
  };
}

function parse_perms(perms) {
  var perm_lookups = {};
  _.each(perms, function(line) {
    var obj = read_perm_line(line);
    perm_lookups[obj.role] = obj;
  });

  function parse_group(obj, group_name, character) {
    var ret = [];
    _.each(obj[group_name], function(o) {
      if (o[0] == character) {
        var other = perm_lookups[o.slice(1)];
        if (other) {
          ret = ret.concat(other[group_name]);
        }
      } else {
        ret.push(o);
      }
    });

    return ret;
  }

  _.each(perm_lookups, function(obj) {

    var perms = parse_group(obj, 'perms', '%');
    var users = parse_group(obj, 'users', '$');
    var tables = parse_group(obj, 'tables', '^');

    obj.mm_perms = _.map(perms, minimatch.Minimatch);
    obj.mm_tables = _.map(tables, minimatch.Minimatch);
    obj.mm_users = _.map(users, minimatch.Minimatch);

  });


  return perm_lookups;
}

var ACL = {
  check: function(perm, table, user) {
    var allow = false;
    var groups = readfile(config.authorized_roles);

    var perms = groups.split("\n");
    var perm_lookups = parse_perms(perms);

    var matched;
    _.each(perm_lookups, function(obj, key) {
      _.each(obj.mm_users, function(mm) {
        if (!mm.match(user)) {
          return;
        }


        _.each(obj.mm_tables, function(mm) {
          if (!mm.match(table)) {
            return;
          }

          _.each(obj.mm_perms, function(mm) {
            if (!mm.match(perm)) {
              return;
            }

            allow = true;
            matched = obj;
          });
        });
      });
    });

    return allow;
  }
};



module.exports = ACL;
