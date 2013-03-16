var Component = require("client/js/component");

// TODO: refactor this into a pattern for controllers to generally use for
// socket subscriptions
var handle_socket = function(socket) {

  var _kittens = [];

  function trimKittens() {
    var MAX_KITTENS = 30;
    var new_kittens = [];

    if (_kittens.length > MAX_KITTENS) {
      for (var i = 0; i < _kittens.length; i++) {
        if (i < MAX_KITTENS) {
          new_kittens.push(_kittens[i]);
        } else {
          _kittens[i].$el.fadeOut();
          _kittens[i].remove(); // yes? no on dispose?
        }
      }

      _kittens = new_kittens
    }
  }

  socket.on("kitten", function(data) {

    Component.build("kitten_tile", {
      name: data.id,
      active: data.active,
      render: true
    }, function(tile) {
      tile.$el.appendTo($("#kitten_list"));

      _kittens.unshift(tile);
      trimKittens();
    });

  });

  // What happens with messages from others?
  socket.on("msgs", function(data) {
    console.log("MSGS", data);
  });
  socket.emit("history"); // ask for the history

  Component.build("kitten_tile", {
    name: "me",
    active: Date.now(),
    render: true
  }, function(tile) {
    // TODO: scope this to just the current query controller's page
    tile.$el.appendTo($("#kitten_list"));

    // keep track of this tile, too
    _kittens.push(tile);
  });
};

module.exports = {
  init: function(data) {
    jank.watch("kitten", function(kitten) {
      console.log("KITTEN UPDATE DIRECTIVE RECEIVED");
      var img = $("<img />");
      img.attr('src', "http://placekitten.com/800/600?image=" + kitten);
      img.attr("width", "800px");
      img.attr("height", "600px");

      var bodyEl = $("<div />");
      bodyEl.append(img);
      $("#query_kitten").html("");
      $("#query_kitten").append(bodyEl);
      bodyEl.fadeIn();
    });
  },
  socket: handle_socket,

  delegates: {
    handle_logout: function(el, evt) {
      $.post("/logout", function() {
        $(location).attr("href", "/");
      });
    }
  }
};
