import pudgy
from .view import ViewBase

class SamplesView(ViewBase, pudgy.JSComponent):
    NAME="samples"
    BASE="samples"
    DISPLAY_NAME="Samples View"

    def get_controls(self):
        controls = []

        self.add_go_button(controls)
        self.add_view_selector(controls)
        self.add_time_controls(controls)

        self.add_limit_selector(controls)

        self.add_go_button(controls)

        return controls

