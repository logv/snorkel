"use strict";

var db = require_root("server/db");
var Faker = require("Faker");

var field_generator = {
  integer: function() {
    return parseInt(Math.random() * 10000, 10);
  },
  string: function() {
    var ret;
    if (Math.random() < 0.5) {
      ret = Faker.Name.findName();
    } else {
      ret = Faker.Internet.domainName();
    }

    return ret;
  },
  set: function() {
    var ret = [];
    var elements = parseInt(Math.random() * 50, 10);
    for (var i = 0; i < elements; i++) {
      ret.push(field_generator.string());
    }

    return ret;
  }

};

var perf_schema = {
  integer: [ 'bytes', 'css_bytes', 'tti', 'e2e', 'weight' ],
  string: ['browser', 'email', 'app', 'url', 'company'],
  set: [ 'experiments' ]
};

var perf_schema = [
  {
    dist: [4000, 1000],
    type: "integer",
    name: "tti"
  },
  {
    dist: [300000, 100000],
    type: "integer",
    name: "css_bytes"
  },
  {
    dist: [35000, 10000],
    type: "integer",
    name: "e2e"
  },
  {
    dist: [10000, 1000],
    type: "integer",
    name: "weight"
  },
  {
    dist: [3000000, 1000000],
    type: "integer",
    name: "html_bytes"
  },
  {
    type: "string",
    name: "browser",
    examples: [ "chrome", "firefox", "safari", "ie", "opera", "mobile safari" ]
  },
  {
    type: "string",
    name: "country",
    examples: ["us", "br", "it", "ca", "mx", "tr", "in", "id", "gb", "jp"]
  },
  {
    type: "string",
    name: "route",
    examples: [ "index", "home", "data", "query", "login", "logout" ]
  },
  {
    type: "string",
    name: "method",
    examples: [ "POST", "GET" ]
  },
  {
    type: "set",
    name: "experiments",
    examples: [ "foo_on", "foo_off" ]
  },
  {
    type: "set",
    name: "exp_off",
    examples: [ "exp1", "exp2", "exp3" ]
  },
  {
    type: "set",
    name: "exp_on",
    examples: [ "exp1", "exp2", "exp3" ]
  }
];


// http://www.protonfish.com/random.shtml
// standard normal distribution
function rnd_snd() {
  return (Math.random()*2-1)+(Math.random()*2-1)+(Math.random()*2-1)+(Math.random()*2-1);
}

function rnd(mean, stdev) {
  return Math.round(rnd_snd()*stdev+mean);
}
// end gank



function generate_sample_from_schema(schema) {
  var delta = Math.random() * 60 * 60 * 24 * 7; // -1 weeks of data?
  var sample = {
    integer: {
      time: parseInt(Date.now() / 1000 - delta, 10)
    }
  };

  function random_choice(arr) {
    return arr[parseInt(Math.random() * arr.length, 10)];
  }

  _.each(schema, function(field) {
    var field_type = field.type;
    var field_value;

    if (field_type == "string") {
      field_value = random_choice(field.examples);
    }
    if (field_type == "integer") {
      if (field.range) {
        var lower = Math.min.apply(null, field.range);
        var upper = Math.max.apply(null, field.range);
        field_value = parseInt(Math.random() * (upper - lower) + lower, 10);
      } 

      if (field.dist) {
        field_value = parseInt(rnd.apply(null, field.dist));
      }
    }
    if (field_type == "set") {
      field_value = [];
      var items = parseInt(Math.random() * field.examples.length, 10);
      for (var i = 0; i < items; i++) {
        field_value.push(random_choice(field.examples));
      }
    }

    sample[field_type] = sample[field_type] || {};
    sample[field_type][field.name] = field_value;
  });

  return sample;
}


module.exports = {
  generate: function() {
    var sample = generate_sample_from_schema(perf_schema);
  },
  sample: function() {
    return generate_sample_from_schema(perf_schema);
  }
};
