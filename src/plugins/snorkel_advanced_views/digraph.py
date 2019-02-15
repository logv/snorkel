import pudgy

from snorkel.views import ViewBase
from snorkel.components import *

from ..snorkel_basic_views import TableView
import os

class DigraphView(TableView):
    NAME="digraph"
    BASE="table"
    DISPLAY_NAME="DiGraph View"
    BASE_DIR=os.path.dirname(__file__)
    SUPPORT_COMPARE_QUERIES=False

    @classmethod
    def add_custom_params(self, query_spec):
        dim_one = query_spec.get("dim_one")
        dim_two = query_spec.get("dim_two")
        groupby = query_spec.get_groupby()
        groupby.extend([dim_one, dim_two])
        query_spec.setlist('groupby[]', groupby)

    def add_graph_controls(self, controls):
        def make_dict(arr):
            return dict([(w,w) for w in arr])

        groups = make_dict(self.context.metadata["columns"]["strs"])
        prev_node = Selector(
            name="dim_one",
            options=groups,
            selected=self.context.query.get('dim_one', ''))

        next_node = Selector(
            name="dim_two",
            options=groups,
            selected=self.context.query.get('dim_two', ''))

        controls.append(ControlRow("prev_node", "Prev Node", prev_node))
        controls.append(ControlRow("next_node", "Next Node", next_node))


    def get_controls(self):
        controls = []
        self.add_time_controls(controls)

        self.add_groupby_selector(controls)
        self.add_limit_selector(controls)

        self.add_graph_controls(controls)

        self.add_go_button(controls)

        return controls
