import os
import pudgy

from snorkel.views import ViewBase

class DistView(ViewBase, pudgy.JSComponent, pudgy.SassComponent):
    NAME="dist"
    BASE="dist"
    DISPLAY_NAME="Dist View"
    BASE_DIR=os.path.dirname(__file__)
    SUPPORT_COMPARE_QUERIES = True

    def get_controls(self):
        controls = []

        self.add_time_controls(controls)

        self.add_field_selector(controls)
        self.add_go_button(controls)

        return controls
