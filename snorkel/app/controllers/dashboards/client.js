module.exports = {
  events: {
    "click .add_dashboard" : "handle_new_dashboard"
  },
  click_handler_uno: function() {
    console.log("Handling a click");
  },
  handle_new_dashboard: function() {
    var dismissButton = $('<button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>');
    var createButton = $('<button class="btn btn-primary really_add">Add Dashboard</button> </div>');
    var footerEl = $("<div />");
    footerEl
      .append(dismissButton)
      .append(createButton);

    $C("modal", {title: "Name your dashboard", footer: footerEl.html()}, function(cmp) {
      var bodyEl = $('<input type="text" name="dashboard" class="dashboard">');
      cmp.$el.find(".modal-body").append(bodyEl);

      var reallyAddEl = cmp.$el.find(".really_add");
      reallyAddEl.on("click", function() {
        var val = cmp.$el.find(".dashboard").val();
        SF.socket().emit("new_dashboard", val, function(res) {
          if (res === "OK") {
            window.location = "/dashboard?id=" + val;
          }
        });
        cmp.hide(); });
    });
  },

};
