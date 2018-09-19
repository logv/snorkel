import pudgy
from .components import *

def make_dict(arr):
    return dict([(w,w) for w in arr])

START_TIME_OPTIONS = [
    "-1 hour",
    "-3 hours",
    "-6 hours",
    "-12 hours",
    "-1 day",
    "-3 days",
    "-1 week",
    "-2 weeks",
    "-1 month",
    "-3 months",
    "-6 months",
    "-1 year"
]

END_TIME_OPTIONS = [
    "Now",
    "-1 hour",
    "-3 hours",
    "-6 hours",
    "-12 hours",
    "-1 day",
    "-3 days",
    "-1 week",
    "-2 weeks",
    "-1 month",
]

AGAINST_TIME_OPTIONS = [
    "-1 hour",
    "-3 hours",
    "-6 hours",
    "-12 hours",
    "-1 day",
    "-3 days",
    "-1 week",
    "-2 weeks",
]


VIEW_OPTIONS = [
   ("Table", "table"),
   "time",
   "dist",
   "samples",
]

METRIC_OPTIONS = [
    "Avg",
    "Sum",
    "Count",
    "p5",
    "p25",
    "p50",
    "p75",
    "p95",
    "Distinct",
]

class DatasetPresenter(object):
    def __init__(self, *args, **kwargs):
        self.table = kwargs['table']

    def get_views(self):
        return VIEW_OPTIONS

    def get_metrics(self):
        return METRIC_OPTIONS

# a virtual component has no assets,
# but its descendants might
@pudgy.Virtual
class ViewBase(pudgy.BackboneComponent):
    def add_time_controls(self, controls):
        start_time = Selector(
            name="start",
            options=START_TIME_OPTIONS,
            selected=self.context.query.start)

        end_time = Selector(
            name="end",
            options=END_TIME_OPTIONS,
            selected=self.context.query.end)

        against_time = Selector(
            name="against",
            options=AGAINST_TIME_OPTIONS,
            selected=self.context.query.against)

        controls.append(ControlRow("start", "Start", start_time))
        controls.append(ControlRow("end", "End", end_time))
        controls.append(ControlRow("against", "Against", against_time))

    def add_view_selector(self, controls):
        view_selector = Selector(
            name="view",
            options=self.context.presenter.get_views(),
            selected=self.context.query.table)

        controls.append(ControlRow("view", "View", view_selector))

    def add_limit_selector(self, controls):
        limit_selector = TextInput(
            name="limit",
            value=self.context.query.limit)

        controls.append(ControlRow("limit", "Limit", limit_selector))

    def add_groupby_selector(self, controls):
        groups = make_dict(self.context.info["columns"]["strs"])
        groupby = MultiSelect(
            name="groupby[]",
            options=groups,
            selected=self.context.query.groupby)
        controls.append(ControlRow("groupby[]", "Group By", groupby))

    def add_metric_selector(self, controls):
        metric_selector = Selector(
            name="metric",
            options=self.context.presenter.get_metrics(),
            selected=self.context.query.table)

        controls.append(ControlRow("metric", "Metric", metric_selector))


    def add_fields_selector(self, controls):
        fields = make_dict(self.context.info["columns"]["ints"])
        fields = MultiSelect(
            name="fields[]",
            options=fields,
            selected=self.context.query.fields)
        controls.append(ControlRow("fields[]", "Fields", fields))

    def add_go_button(self, controls):
        button = Button(name='go', className='go')
        controls.append(button)


    def get_controls(self):
        controls = []

        self.add_go_button(controls)
        self.add_view_selector(controls)
        self.add_time_controls(controls)

        self.add_groupby_selector(controls)
        self.add_limit_selector(controls)

        self.add_metric_selector(controls)
        self.add_fields_selector(controls)
        self.add_go_button(controls)

        return controls

class TableView(ViewBase, pudgy.JSComponent, pudgy.MustacheComponent):
    NAME="table"
    BASE="table"

    def __prepare__(self):
        pass

class TimeView(ViewBase, pudgy.JSComponent):
    NAME="time"
    BASE="time"

class DistView(ViewBase, pudgy.JSComponent):
    NAME="dist"
    BASE="dist"

class SamplesView(ViewBase, pudgy.JSComponent):
    NAME="samples"
    BASE="samples"
