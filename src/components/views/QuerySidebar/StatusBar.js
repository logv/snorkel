

var _output, _elapsed;
module.exports = {
  set_query_time: function(elapsed) {
    _elapsed = elapsed;
    $("#status_bar .timing").html("query finished in " + _elapsed + "ms");
    $("#status_bar .details").removeClass("hidden");
  },
  set_output: function(output) {
    _output = output;
  },
  reset: function() {
    $("#status_bar .timing").html("");
    $("#status_bar .details").addClass("hidden");
  }
};
