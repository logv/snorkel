from .views import *

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

VIEW_OPTIONS = [ TableView, TimeView, DistView, SamplesView, TimelineView ]
class DatasetPresenter(object):
    def __init__(self, *args, **kwargs):
        self.table = kwargs['table']

    def get_views(self):
        ret = []
        for view in VIEW_OPTIONS:
            ret.append((view.get_display_name(), view.get_name()))

        return ret

    def get_metrics(self):
        return METRIC_OPTIONS

