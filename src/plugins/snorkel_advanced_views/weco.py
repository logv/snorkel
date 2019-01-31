import pudgy
import os

from snorkel.components import Selector, ControlRow
from snorkel.views import ViewBase

import sys

from src.plugins.snorkel_basic_views import TimeView

def make_dict(arr):
    return dict([(w,w) for w in arr])

# this line lets us access TimeView's modules via prefix
pudgy.components.add_dirhash_alias("timeview", TimeView)
class WecoView(TimeView, pudgy.JSComponent, pudgy.SassComponent):
    NAME="weco"
    BASE="time"
    DISPLAY_NAME="Weco View"
    BASE_DIR=os.path.dirname(__file__)

    @classmethod
    def get_defines(cls):
        reqs = TimeView.get_requires()
        ret = TimeView.render_requires(reqs)
        ret["TimeView/TimeView"] = TimeView.get_js()
        return ret

    def add_forecast_controls(self, controls):
        groups = make_dict(self.context.metadata["columns"]["strs"])
        model_type = Selector(
            name="model_type",
            options={ "additive" : "additive", "multiplicative" : "multiplicative"},
            selected=self.context.query.get("model_type"))

        controls.append(ControlRow("model_type", "Model Type", model_type))

        iter_mode = Selector(
            name="iter_mode",
            options={"fast" : "fast", "slow" : "thorough"},
            selected=self.context.query.get("iter_mode"))

        controls.append(ControlRow("iter_mode", "Exploration", iter_mode))

        componentize = Selector(
            name="componentize",
            options={"" : "hide", "componentize" : "show"},
            selected=self.context.query.get("componentize"))

        controls.append(ControlRow("componentize", "Components", componentize))

    def get_controls(self):
        controls = []

        self.add_time_controls(controls)

        self.add_time_series_controls(controls)

        self.add_groupby_selector(controls)
        self.add_limit_selector(controls)

        self.add_forecast_controls(controls)

        self.add_metric_selector(controls)
        self.add_fields_selector(controls)
        self.add_go_button(controls)

        return controls
