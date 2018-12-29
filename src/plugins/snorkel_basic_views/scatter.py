import pudgy
import os

from snorkel.components import Selector, ControlRow
from snorkel.views import ViewBase

def make_dict(arr):
    return dict([(w,w) for w in arr])

class ScatterView(ViewBase, pudgy.JSComponent):
    NAME="scatter"
    BASE="samples"
    DISPLAY_NAME="Scatter View"
    BASE_DIR=os.path.dirname(__file__)

    def add_scatter_controls(self, controls):
        fields = make_dict(self.context.metadata["columns"]["ints"])
        field = Selector(
            name="field",
            options=fields,
            selected=self.context.query.get('field'))

        field2 = Selector(
            name="field_two",
            options=fields,
            selected=self.context.query.get('field_two'))

        reverse_axis = Selector(
            name="reverse_axis",
            options={
                "Reverse Both " : "reverse_b",
                "Reverse Y Axis" : "reverse_y",
                "Reverse X Axis" : "reverse_x",
                "Normal" : "none",
            },
            selected=self.context.query.get('reverse_axis', "none"))


        controls.append(ControlRow("field", "Field", field))
        controls.append(ControlRow("field_two", "Field (2)", field2))
        controls.append(ControlRow("reverse_axis", "Reverse Axis", reverse_axis))



    def get_controls(self):
        controls = []

        self.add_time_controls(controls)
#        self.add_time_comparison(controls)

        self.add_scatter_controls(controls)

        self.add_groupby_selector(controls)
        self.add_limit_selector(controls)

        self.add_go_button(controls)

        return controls
