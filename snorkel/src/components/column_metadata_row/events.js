"use strict";

var fields = [ 
  "display_name", 
  "description", 
  "axis", 
  "hist_bucket",  
];

module.exports = { 
  events: {
    "click .advanced" :  "handle_more_clicked"
  },

  handle_more_clicked: function() {

    var title = "Configure settings for "  + this.name;
    var body = "";
    window.$C("modal", {title: title, body: body}, function(cmp) { 
      var bodyEl = cmp.$el.find(".modal-body");

      var after = _.after(fields.length, function() {
        cmp.show();
      });

      _.each(fields, function(field) {
        var field_row = $("<div>");
        field_row.append($("<h3>").html("<b>" + field + "</b>"));

        window.$C("xeditable", { content: "" }, function(cmp) {
          field_row.append(cmp.$el);
          after();
        });

        bodyEl.append(field_row);
      });

      cmp.$el.on('hide', function() {
        // should probably read config out of here, now
      });
    });
  }
};
