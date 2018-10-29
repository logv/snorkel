import pudgy
import os

from snorkel.components import Selector, ControlRow
from snorkel.views import ViewBase

def make_dict(arr):
    return dict([(w,w) for w in arr])

class OverviewView(ViewBase, pudgy.JSComponent, pudgy.SassComponent):
    NAME="overview"
    BASE="samples"
    DISPLAY_NAME="Overview View"
    BASE_DIR=os.path.dirname(__file__)

    def get_controls(self):
        controls = []

        self.add_time_controls(controls)

        self.add_limit_selector(controls)

        self.add_go_button(controls)

        return controls

