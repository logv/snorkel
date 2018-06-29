/**
 * jQuery Deserialize plugin
 *
 * Deserializes a query string (taken for example from window.location.hash string) into the appropriate form elements.
 *
 * Usage
 * $("form").deserialize(string);
 *
 * do not trigger change events on elements
 * $("form").deserialize(string, {noEvents: true});
 *
 * expect checkboxes to be serialized as boolean (true/false) rather than standard (present/missing)
 * $("form").deserialize(string, {checkboxesAsBools: true});
**/
(function($) {
    $.fn.deserialize = function(s, options) {
      function optionallyTrigger(element,event) {
        if (options.noEvents) 
          return;
        element.trigger(event);
      }

      function changeChecked($input, newState) {
        var oldState = $input.is(":checked");
        $input.attr("checked", newState);
        if (oldState != newState) 
          optionallyTrigger($input, 'change');
      }

      options = options || {};
      var data = {};
      var parts = s.split("&");

      for (var i = 0; i < parts.length; i++) {
        var pair = $.map(parts[i].replace(/\+/g, '%20').split("="), function(d) {
          return decodeURIComponent(d); 
        });

        //collect data for checkbox handling
        data[pair[0]] = pair[1];

        var $input = $("[name='" + pair[0] + "']", this);
        var type = $input.attr('type');

        if (type == 'radio') {
          $input = $input.filter("[value='" + pair[1] + "']");
          changeChecked($input, true);
        } else if (type == 'checkbox') { 
          // see below
        } else {
          var oldVal = $input.val();
          var newVal = pair[1];
          $input.val(newVal);
          if (oldVal != newVal) 
            optionallyTrigger($input, 'change');
        }
      }

      $("input[type=checkbox]", this).each(function() {
        var $name = this["name"];
        var $input = $(this);
        if (options.checkboxesAsBools) {
          //checkboxes are serialized as non-standard true/false, so only change value if provided (as explicit 
          // boolean) in the data. (so checkboxes behave like other fields - unspecified fields are unchanged)
          if (data[$name] == 'true')
            changeChecked($input, true);
          else if (data[$name] == 'false')
            changeChecked($input, false);
        }
        else {
          //standard serialization, so checkboxes are not serialized -> ANY missing value means unchecked 
          // (no difference betwen "missing" and "false").
          changeChecked($input, ($input.attr("name") in data));
        }
      });
    };
})(jQuery);
