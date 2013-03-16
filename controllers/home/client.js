"use strict";

module.exports = {
  delegates: { 
    im_too_lazy: function() {
      $C("button", {
          name: "my first button"
        }, function(btn) { 
          $("#button_holder").empty(); // extra

          btn.prependTo($("#button_holder")); 

          // alright, this is technically extra
          btn.$el.hide();
          btn.$el.fadeIn();
        }); 
    }
  }
};
