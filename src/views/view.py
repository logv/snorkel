import pudgy
from ..components import *
from .. import backend

from ..components import OldSnorkelComponent

import dotmap
import werkzeug
import os
import jinja2

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
    "",
    "-1 hour",
    "-3 hours",
    "-6 hours",
    "-12 hours",
    "-1 day",
    "-3 days",
    "-1 week",
    "-2 weeks",
]

VIEW_OPTIONS = []

class filter_row(OldSnorkelComponent):
    pass

class tabs(OldSnorkelComponent):
    pass

FilterRow = filter_row

def get_column_types(md):
    types = {}
    fields = {}

    for field in md['columns']['strs']:
        fields[field] = field
        types[field] = 'string'

    for field in md['columns']['ints']:
        fields[field] = field
        types[field] = 'integer'

    return fields, types

@pudgy.Virtual
class ViewBase(pudgy.BackboneComponent):
    NAMESPACE = "views"
    DISPLAY_NAME=""
    NAME="ViewBase"

    @classmethod
    def get_display_name(self):
        return self.DISPLAY_NAME or self.NAME

    @classmethod
    def get_name(self):
        return "%s" % (self.NAME)

    def add_time_controls(self, controls):
        start_time = Selector(
            name="start",
            options=START_TIME_OPTIONS,
            selected=self.context.query.get('start'))

        end_time = Selector(
            name="end",
            options=END_TIME_OPTIONS,
            selected=self.context.query.get('end'))

        controls.append(ControlRow("start", "Start", start_time))
        controls.append(ControlRow("end", "End", end_time))

    def add_time_comparison(self, controls):
        against_time = Selector(
            name="against",
            options=AGAINST_TIME_OPTIONS,
            selected=self.context.query.get('against'))

        controls.append(ControlRow("against", "Against", against_time))

    def add_view_selector(self, controls):
        view_selector = Selector(
            name="view",
            options=self.context.presenter.get_views(),
            selected=self.context.query.get('view'))

        controls.append(ControlRow("view", "View", view_selector))

    def add_limit_selector(self, controls):
        limit_selector = TextInput(
            name="limit",
            value=self.context.query.get('limit', 10) or 10)

        controls.append(ControlRow("limit", "Limit", limit_selector))

    def add_groupby_selector(self, controls):
        groups = make_dict(self.context.metadata["columns"]["strs"])
        groupby = MultiSelect(
            name="groupby[]",
            options=groups,
            selected=self.context.query.getlist('groupby[]'))

        controls.append(ControlRow("groupby[]", "Group By", groupby))

    def add_metric_selector(self, controls):
        metric_selector = Selector(
            name="metric",
            options=self.context.presenter.get_metrics(),
            selected=self.context.query.get('metric'))

        controls.append(ControlRow("metric", "Metric", metric_selector))


    def add_field_selector(self, controls):
        fields = make_dict(self.context.metadata["columns"]["ints"])
        fields = Selector(
            name="field",
            options=fields,
            selected=self.context.query.get('field'))
        controls.append(ControlRow("field", "Field", fields))

    def add_fields_selector(self, controls):
        fields = make_dict(self.context.metadata["columns"]["ints"])
        fields = MultiSelect(
            name="fields[]",
            options=fields,
            selected=self.context.query.getlist('fields[]'))
        controls.append(ControlRow("fields[]", "Fields", fields))

    def add_go_button(self, controls):
        button = Button(name='Go', className='go')
        controls.append(button)

    def get_filters(self, filters):
        controls = []
        md = self.context.metadata

        fields, types = get_column_types(md)
        if not filters:
            # at least one default filter
            filters = [[ "", "", ""]]

        for f in filters:
            filter = FilterRow(fields=fields)
            filter.context.update(
                selected=f[0],
                op=f[1],
                value=f[2]
            )
            filter.marshal(types=types)
            controls.append(filter)

        return controls


    def get_controls(self):
        controls = []

        self.add_go_button(controls)
        self.add_view_selector(controls)
        self.add_time_controls(controls)
#        self.add_time_comparison(controls)

        self.add_groupby_selector(controls)
        self.add_limit_selector(controls)

        self.add_metric_selector(controls)
        self.add_fields_selector(controls)

        return controls

    def get_stats(self):
        pass


def get_view_by_name(name):
    for cls in pudgy.util.inheritors(ViewBase):
        if cls.NAME.lower() == name.lower():
            return cls
