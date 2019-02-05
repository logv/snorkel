import pudgy

from snorkel.views import ViewBase
from snorkel.components import *
import os

import numbers

TIME_SLICE_OPTIONS = [
    "auto",
    ("1 min", 60),
    ("5 min", 60 * 5),
    ("10 min", 60 * 10),
    ("30 min", 60 * 30),
    ("1 hour", 60 * 60),
    ("3 hours", 60 * 60 * 3),
    ("6 hours", 60 * 60 * 6),
    ("12 hours", 60 * 60 * 12),
    ("daily", 60 * 60 * 24),
]


class nvd3(OldSnorkelComponent):
    pass

class TimeView(ViewBase, pudgy.JSComponent):
    NAME="time"
    BASE="time"
    DISPLAY_NAME="Time View"
    BASE_DIR=os.path.dirname(__file__)
    SUPPORT_COMPARE_QUERIES=True



    def add_time_series_controls(self, controls):
        time_slice = Selector(
            name="time_bucket",
            options=TIME_SLICE_OPTIONS,
            selected=self.context.query.get("time_bucket"))

        controls.append(ControlRow("time_bucket", "Time Slice", time_slice))

        normalize = Selector(
            name="time_divisor",
            options=[ "", "hour", "minute" ],
            selected=self.context.query.get("time_divisor"))
        controls.append(ControlRow("time_divisor", "Normalize", normalize))



    def get_controls(self):
        controls = []

        self.add_time_controls(controls)
#        self.add_time_comparison(controls)

        self.add_time_series_controls(controls)

        self.add_groupby_selector(controls)
        self.add_limit_selector(controls)

        self.add_metric_selector(controls)
        self.add_fields_selector(controls)
        self.add_go_button(controls)

        return controls

    def __prepare__(self):
        pass
