"use strict";

var _datasets = {};
module.exports = {
  events: {
    "click .logout" : "handle_logout",
    "click .really_drop" : function(obj) {
      console.log("REALLY DROP", this, obj);
    }
  },
  initialize: function() {
  },
  handle_logout: function() {
    $.post("/logout", function() {
      $(window.location).attr("href", "/");
    });
  },


  socket: function(socket) {
    socket.on("dropped", function(dataset) {
      console.log("DROPPED DATASET", dataset);
      _datasets[dataset].$el.fadeOut(function() {
        _datasets[dataset].remove();
        delete _datasets[dataset];
      });
    });
  },

  delegates: {
    handle_delete_clicked: function(obj) {

      var dataset = obj.dataset;
      var footerEl = $("<div />");
      var dismissButton = $('<button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>');
      var deleteButton = $('<button class="btn btn-primary really_drop">Drop Dataset</button> </div>');
      deleteButton.data("dataset", dataset);

      footerEl
        .append(dismissButton)
        .append(deleteButton);

      $C("modal", { 
        title: "Confirm dataset deletion?", 
        body: "You are about to drop the " + dataset + " dataset. Are you sure?",
        footer: footerEl.html()
      }, function(cmp) {
        var reallyDropEl = cmp.$el.find(".really_drop");
        reallyDropEl.on("click", function() {
          _datasets[dataset] = obj;
          jank.socket().emit("drop", dataset);
          cmp.hide();
        });

        cmp.show();
      });
    }
  }
};
