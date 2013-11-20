// i dont like that clicking links that are just #href causes me history
// problems.
$(document).on("click", "a[href^='#']", function(event) {
  if (!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
    event.preventDefault();
  }
});
