

module.exports = { 
  events: {
    "click .delete" : function() {
      this.delete_announcement();
    },
    "click .hide_announcement" : function() {
      this.hide_announcement();
    }
  },

};
