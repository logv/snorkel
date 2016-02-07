"use strict";

module.exports = {
  tagName: "tr",
  className: "column_metadata_row",
  // import bits for a column
  defaults: {
    name: 'a column',
    description: '',
    axis: '',
    display_name: '',
    hist_bucket: '',
    hidden: false,
    should_go_up: true
  },

  client: function(options) {
    var cells = this.$el.find("td.editable.auto");
    var that = this;
    this.metadata = options.metadata;
    this.name = this.metadata.name;
    this.type = this.metadata.type;

    _.delay(function() {
      var after = _.after(cells.length, function() {
        SF.controller().trigger("new_column_metadata", that);
      });

      _.each(cells, function(cell) {
        var $cell = $(cell);
        var name = $cell.attr("data-name");
        $C("xeditable", { content: $cell.html(), mode: 'popup', name: name, client_options: { name: name } }, function(cmp) {
          $cell.empty().append(cmp.$el);
          after();
        });
      });
    }, Math.random() * 200);

    $C("xeditable", {}, function() {
      that.$el.find("td .editable[data-name='hidden']").editable({
        source: [
          {value: 'true', text: 'true'},
          {value: 'false', text: 'false'}
        ],
        mode: 'popup',
        type: 'select'
      });
    });

    $C("xeditable", {}, function() {
      that.$el.find("td .editable[data-name='time_col']").editable({
        source: [
          {value: 'true', text: 'true'},
          {value: 'false', text: 'false'}
        ],
        mode: 'popup',
        type: 'select'
      });
    });

    $C("xeditable", {}, function() {
      that.$el.find("td .editable[data-name='groupable']").editable({
        source: [
          {value: 'true', text: 'true'},
          {value: 'false', text: 'false'}
        ],
        mode: 'popup',
        type: 'select'
      });
    });

    $C("xeditable", {}, function() {
      that.$el.find("td .editable[data-name='formatter']").editable({
        mode: 'popup',
        type: 'textarea'
      });
    });

    $C("xeditable", {}, function() {
      that.$el.find("td .editable[data-name='description']").editable({
        mode: 'popup',
        type: 'textarea'
      });
    });



  },

  get_name: function() {
    return this.name;
  },

  get_config: function() {
    var vals = this.$el.find(".editable").editable('getValue');


    _.extend(this.metadata, vals);

    return this.metadata;
  }
};
