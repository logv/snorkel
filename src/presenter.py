from __future__ import print_function
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
            return p


HIDDEN_TABLES = {}
TABLE_NAMES = {}
def SetTableName(realname, name):
    TABLE_NAMES[realname] = name

def SetTableNames(name_lookup):
    for name in name_lookup:
        SetTableName(name, name_lookup[name])

def GetTableName(name):
    if name in TABLE_NAMES:
        return TABLE_NAMES[name]

    return name

def GetRealTable(name):
    for n in TABLE_NAMES:
        if TABLE_NAMES[n] == name:
            return n

    return name

def HideTables(*names):
    for n in names:
        HIDDEN_TABLES[n] = True

def IsTableHidden(name):
    return name in HIDDEN_TABLES

def IsTableVisible(name):
    return not IsTableHidden(name)

# PARAMETERS:
# name=<str> - name to display when showing the table
# hidden=<bool> - whether to hide the table or not
def ConfigureTable(table, **kwargs):
    if "name" in kwargs:
        SetTableName(table, kwargs.get("name"))

    if kwargs.get('hidden', False):
        HideTables(table)
