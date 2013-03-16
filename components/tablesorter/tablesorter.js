"use strict";

module.exports = {
  tagName: "table",
  className: "",
  client: function() {
    $(this.el).addClass("tablesorter");
    $(this.el).tablesorter();
  }
};
