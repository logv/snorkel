import pudgy
from .view import ViewBase

class DistView(ViewBase, pudgy.JSComponent):
    NAME="dist"
    BASE="dist"
    DISPLAY_NAME="Dist View"

    def get_controls(self):
        controls = []

        self.add_go_button(controls)
        self.add_view_selector(controls)
        self.add_time_controls(controls)
        self.add_time_comparison(controls)

        self.add_field_selector(controls)
        self.add_go_button(controls)

        return controls


