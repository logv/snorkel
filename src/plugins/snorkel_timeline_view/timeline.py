import pudgy
import os

from snorkel.components import Selector, ControlRow
from snorkel.views import ViewBase

def make_dict(arr):
    return dict([(w,w) for w in arr])

class TimelineView(ViewBase, pudgy.JSComponent, pudgy.SassComponent):
    NAME="timeline"
    BASE="samples"
    DISPLAY_NAME="Timeline View"
    BASE_DIR=os.path.dirname(__file__)

    def add_timeline_controls(self, controls):
        groups = make_dict(self.context.metadata["columns"]["strs"])
        event_field = Selector(
            name="event_field",
            options=groups,
            selected=self.context.query.get("event_field"))

        controls.append(ControlRow("event_field", "Event Field", event_field))



    def get_controls(self):
        controls = []

        self.add_time_controls(controls)
#        self.add_time_comparison(controls)

        self.add_timeline_controls(controls)

        self.add_groupby_selector(controls)
        self.add_limit_selector(controls)

        self.add_go_button(controls)

        return controls
