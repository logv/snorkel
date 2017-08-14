
module.exports = {
  tagName: "div",
  className: "",
  client: function(options) {
    this.ann_id = options.ann_id;
    this.storage = window.bootloader.storage;
    this.show();
  },
  hide_announcement: function() {
    console.log("HIDING THIS", this);

    this.$el.hide();
    var seen_announcements = this.get_seen();
    seen_announcements[this.ann_id] = 1;
    this.storage.set("seen_announcements", JSON.stringify(seen_announcements));
  },
  delete_announcement: function() {
    var $el = this.$el;
    var ann_id = this.ann_id;
    var helpers = bootloader.require("app/client/views/helpers");
    helpers.confirm_action({
      title: "Confirm announcement deletion",
      body: "You are about to delete this announcement, Are you sure?",
      confirm: "Delete Announcement"
    }, function() {
      if (ann_id) {
        SF.socket().emit("delete_announcement", ann_id, function() {
          $el.fadeOut(function() {
            $el.remove(); 
          });
        });
      }

    });
  },
  get_seen: function() {
    try{
      var seen_announcements = JSON.parse(this.storage.get("seen_announcements") || "{}");
      return seen_announcements;
    } catch (err) {
      return {};
    }


  },
  show: function() {
    // TODO: check local storage to see if we've seen this annonucement already
    var ann_id = this.ann_id;
    this.$el.find(".dataset_announcement").removeClass("hidden");
    if (this.get_seen()[ann_id]) {
      this.$el.addClass("seen");
    }

  }
};
