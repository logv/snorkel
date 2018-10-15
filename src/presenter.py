import re

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

VIEW_OPTIONS = [ ]

PRESENTERS = []

class DatasetPresenter(object):
    PRESENTERS = []
    @classmethod
    def add_presenter(regex_rule, config):
        PRESENTERS.append((regex_rule, config))

    def __init__(self, *args, **kwargs):
        self.views = []

    def set_views(self, views):
        self.views = views

    def get_views(self):
        view_options = []
        for view in self.views:
            view_options.append(view)

        ret = []
        for view in view_options:
            ret.append((view.get_display_name(), view.get_name()))

        return ret

    def get_metrics(self):
        return METRIC_OPTIONS

# adds a regex and presenter
def RegisterPresenter(rule, presenter):
    re.compile(rule)
    PRESENTERS.append((rule, presenter))


# given a dataset, returns its presenter (using a regex)
def GetPresenter(dataset):
    for r, p in reversed(PRESENTERS):
        if re.search(r, dataset):
            print "P", p
            return p
