
function get_control(name) {
  var selector = "#query_sidebar .controls[name='" + name + "']";
  var ctl = $(selector);
  console.log("GETTING CONTROL", name);

  return ctl;
}

function get_control_value(name) {
  return get_control(name).find(":input").val();
}

function get_control_row(name) {
  var row = get_control(name).parents(".control-group");

  return row;
}


function update_control(name, value) {
  var control = get_control(name).find(":input");
  control.val(value);
  control.trigger("chosen:updated");
}


module.exports = {
  get_control: get_control,
  set_control: update_control,
  get_control_value: get_control_value,
  get_control_row: get_control_row,

}
