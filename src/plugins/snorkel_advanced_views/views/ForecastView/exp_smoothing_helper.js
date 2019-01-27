// exponential smoothing helper
//
// this file contains functionality that analyzes a highchart style time series
// and provides a DSHW model that best fits the series
//
// the NIST formulas (for multiplicative model) were used as reference for the
// single season implementation, along with grisha's guide. for double seasons,
// i consulted taylor's 2003 and 2010 papers to learn the formulas for double
// season multiplicative and additive models.
//
// notice that there are some areas that refer to ADDITIVE_MODEL - those
// are the divergence points between the two models
//
// {{{ NIST FORMULAS
// holt winters exponential smoothing. we all lead back to the same handbook
//
// http://www.itl.nist.gov/div898/handbook/pmc/section4/pmc435.htm
// NOTE: this is for multiplicative smoothing
//
// observations are Y
//
// coefficients are alpha, beta, gamma
//
// smoothing curves are S (smoothing), B (trend), I (seasonal)
//
// overall smoothing:
// S[t] = alpha * (Y[t] / I[t-L]) + (1 - alpha) * (S[t-1] + B[t-1])
//
// trend smoothing:
// B[t] = beta * (S[t] - S[t-1]) + (1 - beta) * B[t-1]
//
// seasonal smoothing
// I[t] = gamma * (Y[t]/S[t]) + (1 - gamma) * I[t-L]
//
// forecast
// notice that m*B[t] = steps*trend factor + smoothed value + seasonal smoothing
// F[t+m] = (S[t] + m*B[t]) * I[t-L+m]
//
// Y = observations
// S = smoothed observations
// B = trend factor
// I = seasonal index
// F = forecast
//
// L = periods in a season. f.e. if season is 1 week, L = 7 days or 24*7 hours
//
// trend factor initial value:
// B[0] = 1/L * ((Y[L+1]-Y[1])/L + (Y[L+2]-Y[2])/L...)
//
// seasonal indices values:
// 1. calculate avg per season
// 2. divide each observation by its seasonal avg
// 3. I[L] = avg of all observation at offset L from season start
//
// now, we should have Y, S[0], B[0] and I[L] and need to calculate the
// rest of the values
// }}} NIST GUIDE

var ADDITIVE_MODEL=true;
var MULTIPLICATIVE_MODEL = !ADDITIVE_MODEL;

var FAST_MODE = false;

function mod(n, k) {
  return ((n%k)+k)%k;
}

function make_forecast(model, t, m) {

  if (!m) { m = 1; }
  var season_size = model.season_size;
  var sum_seasons = 0;
  var prod_seasons = 1;
  _.each(season_size, function(season_size, i) {
    var season_trend = model.I[i][mod(t+(m%season_size) - season_size, t)];
    sum_seasons += season_trend;
    prod_seasons *= season_trend || 1;
  });

  var coef = m;

  var ret;
  if (ADDITIVE_MODEL) {
    ret = (model.S[t]  + coef*model.B[t]) + sum_seasons;
  } else if (MULTIPLICATIVE_MODEL) {
    ret = (model.S[t]  + coef*model.B[t]) * prod_seasons;
  }

  model.F[t+m] = ret;

  return ret || 0;
}

function update_parameters(model, t) {
  var Y = model.Y;
  var S = model.S;
  var B = model.B;
  var I = model.I;

  var alpha = model.alpha;
  var beta = model.beta;
  var gamma = model.gamma;

  var season_size = model.season_size;
  var sum_seasons = 0;
  var prod_seasons = 1;
  _.each(gamma, function(g, i) {
    var l = mod(t-season_size[i], t);
    sum_seasons += I[i][l];
    prod_seasons *= I[i][l];
  });


  if (ADDITIVE_MODEL) {
    S[t] = alpha * (Y[t] - sum_seasons) + (1 - alpha) * (S[t-1] + B[t-1]);
  } else if (MULTIPLICATIVE_MODEL) {
    S[t] = alpha * (Y[t] / prod_seasons) + (1 - alpha) * (S[t-1] + B[t-1]);
  }

  B[t] = beta * (S[t] - S[t-1]) + (1 - beta) * B[t-1];

  // subtractive seasonality updates
  // the first season takes most of the difference, while subsequent seasons
  // absorb the leftovers
  var prev_seasons = 0;
  var other_seasons;
  _.each(gamma, function(g, i) {
    var l = mod(t-season_size[i], t);
    var this_season = I[i][l];
    if (ADDITIVE_MODEL) {
      other_seasons = (sum_seasons - this_season);
      I[i][t] = g * (Y[t] - S[t] - prev_seasons) + (1 - g) * I[i][l];
      prev_seasons += I[i][t-1];
    } else if (MULTIPLICATIVE_MODEL) {
      other_seasons = (prod_seasons / this_season);
      I[i][t] = g * (Y[t] / (S[t] * other_seasons)) + (1 - g) * I[i][l];
      prev_seasons += I[i][l];
    }

  });
}

function initialize_data(data, season_sizes, alpha, beta, gamma) {
  var Y = _.map(data, function(d) { return d.y; });
  var S = []; // exponential smoothed val
  var B = []; // trend (or derivative)
  var I = []; // seasonal smoothing (or periodic component)

  var multi_season = true;
  if (_.isNumber(season_sizes)) {
    season_sizes = [ season_sizes ];
  }

  if (_.isNumber(gamma)) {
    gamma = [ gamma ];
  }

  _.each(season_sizes, function() {
    I.push([]);
  });


  S[0] = Y[0];
  B[0] = 0;

  // initialized the trend
  // the trend is the average difference in values between season one and season two
  for (var i = 0; i < season_sizes[0]*2; i++) {
    var pt = Y[i];
    var next_pt = Y[season_sizes[0]+i];
    B[0] += (next_pt - pt) / season_sizes[0];
  }
  B[0] /= season_sizes[0];

  // initialize the seasonal components. only season I[0] has data filled in,
  // the other seasons are catching the residuals, so we initialize to 0 or 1
  // in additive model, use 0 (because 0 is additive identity).
  // in multiplicative model start with 1 (because 1 is multiplicative identity)
  _.each(season_sizes, function(season_size, gamma_index) {
    var season_components = [];
    for (i = 0; i < season_size; i++) {
      season_components.push([]);
    }

    var season_avgs = {};
    for (i = 0; i < Y.length / season_size; i++) {
      var season = Y.slice(i*season_size, (i+1)*season_size);

      var season_sum = _.reduce(season, function(memo, num){ return memo + num; }, 0);
      season_avgs[i] = season_sum / season.length;
      _.each(season, function(s, j) {
        var val = (s||1) / season_avgs[i];
        season_components[j].push(val);
      });


    }

    _.each(season_components, function(same_offset, j) {
      var sum = _.reduce(same_offset, function(memo, num){ return memo + (num||0); }, 0);

      I[gamma_index][j] = sum / same_offset.length;

      if (!_.isFinite(I[gamma_index][j])) {
        I[gamma_index][j] = 1;
      }

      if (gamma_index > 0) {
        if (ADDITIVE_MODEL) {
          I[gamma_index][j] = 0;
        } else {
          I[gamma_index][j] = 1;
        }
      }
    });
  });


  var ret = {
    Y: Y,  // observed value
    S: S,  // smoothed value
    B: B,  // trend
    I: I,  // seasonal
    F: [], // forecasts
    alpha: alpha,
    beta: beta,
    gamma: gamma,
    season_size: season_sizes,
    multi_season: multi_season
  };

  return ret;
}

function model_values(serie, season_sizes, params, best_diff) {
  if (!serie.__cached) {
    serie.__cached = {};
  }
  var CACHED = serie.__cached;
  var alpha = params[0];
  var beta = params[1];
  var gamma = params.slice(2);

  var param_key = params.join(",");
  if (CACHED[param_key]) {
    return CACHED[param_key];
  }

  var total_diff = 0;

  var model = initialize_data(serie.data, season_sizes, alpha, beta, gamma);

  for (var t = 1; t < model.Y.length-1; t++) {
    // make our forecast, then update the model with parameters
    // for this data point (not the other way around!)
    make_forecast(model, t-1,1); // saves into model.F[t]


    update_parameters(model, t);

    var diff = Math.pow((model.F[t]||0) - model.Y[t], 2);
    total_diff += diff;

    if (best_diff && total_diff > best_diff) {
      break;
    }

  }

  if (best_diff && total_diff > best_diff) {
    return total_diff;
  }

  CACHED[param_key] = total_diff;
  return total_diff;

}

// get the unit corners of dimension N
// there will be 2^N corners or so, so
// N should stay under 10, ideally
function make_unit_corner(N) {
  var indeces = [1, 0, -1];
  var start = [[]];
  var next = [];

  for (var i = 0; i < N; i++) {
    for (var j = 0; j < start.length; j++) {
      for (var k = 0; k < indeces.length; k++) {
        next.push([indeces[k]].concat(start[j]));
      }
    }

    start = next;
    next = [];
  }

  return start;

}


// this function uses Pattern Search + trust regions
// to search the solution space for best dshw parameters.
//
// as time goes on, we trust regions that haven't provided
// optimal solutions less and less, letting us randomly
// skip over areas that our PS would otherwise tell us
// to examine.
function guess_best_parameters(serie, season_size) {

  // starting values
  var alpha = 0.5; // controls mean learning, higher = faster
  var beta = 0.5; // controls seasonal learning, higher = faster learning
  var gamma = 0.5; // controls trend learning. higher = learn faster

  var best_params = [alpha, beta, gamma];

  // adding on extra predictive seasons
  for (var i = 1; i < season_size.length; i++) {
    best_params.push(gamma);
  }

  var initial = model_values(serie, season_size, best_params);
  var cur_best = initial;

  console.log("INITIAL FIT", cur_best);
  console.log("INITIAL PARAMS", best_params);


  var start = +new Date();
  var step_size = 0.3;

  var iterations = 0;
  var maxes=[];
  for (var i = 0; i < best_params.length; i++) {
    maxes[i] = 1;
  }

  var best_region = null;
  var region_stats = {};

  function rounded(n, k) {
    var bucket = Math.exp(10, k);
    return parseInt(n * bucket, 10) / bucket;
  }

  function trust_region(region) {
    var r = 1;
    for (var i = 0; i < region.length; i++) {
      var stats = region_stats[i];
      if (stats) {
        r += ((stats[region[i]]||1) / stats.total);
      }

    }

    var g = Math.random();
    if (g > r / region.length) {
      return false;
    }

    return true;
  }

  function mark_best_region(region) {
    for (var i = 0; i < region.length; i++) {
      region_stats[i] = region_stats[i] || { total: 0 };
      region_stats[i][region[i]] = (region_stats[i][region[i]] || 0) + 1;
      region_stats[i].total += 1;
    }
  }

  while (step_size > 0.001 && iterations++ < 100) {
    // build nearby locations that are unit corners away
    var prev_best = cur_best;
    var found_best = false;
    var corners = make_unit_corner(best_params.length);
    var evaluated = 0;
    for (var i = 0; i < corners.length; i++) {
      var unit_corner = corners[i];
      var invalid = false;
      var non_zero;
      var region = [];
      for (var j = 0; j < best_params.length; j++) {
        if (unit_corner[j] !== 0) {
          non_zero = true;
        }

        unit_corner[j] *= step_size;
        unit_corner[j] += best_params[j];


        region.push(rounded(unit_corner[j], 3));

        if (unit_corner[j] >= maxes[j] || unit_corner[j] <= 0) {
          invalid = true;
          break;
        }
      }

      if (invalid || !non_zero) {
        continue;
      }

      if (!trust_region(region) && FAST_MODE) {
        continue;
      }


      evaluated += 1;
      var sum = model_values(serie, season_size, unit_corner, cur_best);
      if (sum < cur_best) {
        cur_best = sum;
        best_params = unit_corner;
        best_region = region;
        found_best = true;
      }
    }

    if (prev_best === cur_best || !found_best) {
      step_size *= 0.5; // half the step size if we can't find a new spot
    } else {
      mark_best_region(best_region);
    }

  }

  console.log("PICKING BEST PARAMETERS TOOK", +new Date() - start, "MS");


  alpha = best_params[0];
  beta = best_params[1];
  gamma = best_params.slice(2);

  console.log("BEST FIT", cur_best);
  console.log("BEST PARAMS", best_params);

  return {
    alpha: alpha,
    beta: beta,
    gamma: gamma
  };

}

function add_missing_values(serie, time_bucket, start, end) {
  serie = _.sortBy(serie, function(s) { return s.x; } );

  var expected = serie[0].x;
  var new_serie = [];
  var pt;
  var missing = 0;

  for (var i = 0; i < serie.length; i++) {
    pt = serie[i];
    expected += time_bucket * 1000;

    while (expected < pt.x) {
      missing += 1;
      new_serie.push({
        x: expected,
        y: 0
      });

      expected += time_bucket * 1000;
    }

    expected = pt.x;

    new_serie.push(pt);
  }

//  // fills in the missing values at the end of the series,
//  // which we will ignore for now
//  while (expected < end) {
//    expected += time_bucket * 1000;
//    missing += 1;
//    pt = {
//      x: expected,
//      y: 0
//    };
//
//    new_serie.push(pt);
//  }
//
  console.log("ADDED", missing, "MISSING VALUES");

  return new_serie;
}

module.exports = {
  make_model: function(query, serie) {
    var seconds_in_day = 24 * 60 * 60;
    var seconds_in_week = seconds_in_day * 7;
    var time_bucket = query.parsed.time_bucket;

    var custom_params = query.parsed || {};
    var model_type = custom_params.model_type;
    if (custom_params) {
      console.log("CUSTOM PARAMS ARE", custom_params);
      console.log("MODEL TYPE", custom_params.model_type);
    }

    // reset our cache while we are at it
    if (model_type === "multiplicative") {
      ADDITIVE_MODEL = false;
      MULTIPLICATIVE_MODEL = true;
    } else {
      ADDITIVE_MODEL = true;
      MULTIPLICATIVE_MODEL = false;
    }

    console.log("CUSTOM PARAMS", custom_params);
    if (custom_params.iter_mode === "fast") {
      FAST_MODE = true;
    } else {
      FAST_MODE = false;
    }

    console.log("FAST EXPLORE MODE?", FAST_MODE);

    MULTIPLICATIVE_MODEL = !ADDITIVE_MODEL;

    // the season sizes are one day and one week
    var season_size = seconds_in_day / time_bucket;
    var double_season_size = seconds_in_week / time_bucket;
    var season_sizes = [season_size, double_season_size];

    console.log("SEASON SIZE", season_sizes);
    if (ADDITIVE_MODEL) {
      console.log("USING ADDITIVE MODEL");
    } else {
      console.log("USING MULTIPLICATIVE MODEL");
    }

    if (!serie.data || !serie.data.length || serie.data.length < season_sizes[0]) {
      console.log("NOT MODELING", serie.name, "FOR LACK OF DATA");
      return;
    }

    serie.data = add_missing_values(serie.data, time_bucket, query.parsed.start_ms, query.parsed.end_ms);

    var params = guess_best_parameters(serie, season_sizes);
    console.log("RUNNING HW ON", query, serie, params);

    var alpha = params.alpha;
    var beta = params.beta;
    var gamma = params.gamma;

    var model = initialize_data(serie.data, season_sizes, alpha, beta, gamma);
    console.log("PREDICTIVE MODEL IS", model);

    var start = +new Date();

    for (var t = 1; t < model.Y.length-1; t++) {
      make_forecast(model, t-1, 1);
      update_parameters(model, t);
    }

    var end = +new Date();
    console.log("FILLING MODEL IN TOOK", end - start, "MS");


    t = serie.data.length - 2;
    var last_x = serie.data[t].x;

    return {
      make_forecast: function(m) {
        var forecast = make_forecast(model, t, m);
        var pt = {
          x: last_x + (time_bucket * m) * 1000,
          y: forecast,
          marker: {
            enabled: true,
            radius: 3
          }
        };

        return pt;

      },

      data: serie,
      model: model
    };
  }
};
