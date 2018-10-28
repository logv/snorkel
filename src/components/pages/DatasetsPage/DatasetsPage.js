var $ = $require("jquery");

module.exports = {
  events: {
    "click .superset h1" : "handle_superset_click",
    "click .hidden_datasets h1" : "handle_superset_click",
    "keyup .dataset_finder" : "handle_select_datasets"
  },

  handle_select_datasets: function(e) {
    console.log("SELECT DATASETS");
    var val = $(e.target).val();
    var reg = val.split(" ").join(".*");
    var re = new RegExp(reg);

    if (e.keyCode === 13) {
      // Find the first dataset and navigate to it!
      var tile = $(".dataset_tile:visible").find("h3 a").first();
      if ($(tile).attr('href')) {
        window.location = $(tile).attr("href");
      }

      return;
    }

    $(".superset").each(function() {
      var $superset = $(this);
      var supertitle = $superset.find("h1").text().trim();

      if (val && re.test(supertitle)) {
        $superset.find(".dataset_tile").fadeIn();
      } else {

        $superset.find(".dataset_tile").each(function() {
          var $el = $(this);
          var title = $el.find("h3 a").text().trim();
          if (re.test(supertitle + " " + title)) {
            $el.fadeIn();
          } else {
            $el.hide();
          }
        });
      }

    });

  },



  handle_superset_click: function(e) {
    var container = $(e.target).closest(".superset,.hidden_datasets");

    var add = !container.hasClass("active");
    $(".superset,.hidden_datasets")
      .removeClass("active")
      .find(".status").text(">");

    if (add) {
      container.addClass("active");
      container.find(".status").text("v");
    }
  },
}
