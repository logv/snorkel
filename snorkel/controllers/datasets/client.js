"use strict";

var _datasets = {};

module.exports = {
  events: {
    "click .logout" : "handle_logout",
    "click .save" : "handle_save_metadata",
    "click .cancel" : "handle_discard_metadata"
  },
  initialize: function() {
  },

  initialize_editor: function() {
    var $page = this.$page;
    $C("xeditable", {}, function() {
      var editables = $page.find(".manual.xeditable").editable();
    });

    this.column_config = [];
    var that = this;
    this.on("new_column_metadata", function(col) {
      that.column_config.push(col);
    });
  },

  set_table: function(table) {
    this.table = table;
  },

  handle_save_metadata: function() {
    var $page = this.$page;
    function get_value_from_xeditable(name) {
      var val = $page.find(".dataset_config [data-name=" + name + "]").editable('getValue')[name];
      console.log(name, val);
      return val;
    }

    var _metadata = {
      description: get_value_from_xeditable('description'),
      display_name: get_value_from_xeditable('display_name'),
      columns: {}
    };

    _.each(this.column_config, function(col) {
      _metadata.columns[col.get_name()] = col.get_config();
    });

    jank.socket().emit("set_metadata", this.table, _metadata);
    $page.find(".xeditable").removeClass("editable-unsaved");
    $page.find(".editable").removeClass("editable-unsaved");
  },

  handle_discard_metadata: function() {
    window.location.reload();
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

    socket.on("set_metadata", function(response) {
      console.log("SET DATASET:", response);
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
