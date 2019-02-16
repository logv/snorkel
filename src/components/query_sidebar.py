import pudgy

from .components import UIComponent

import flask


# https://stackoverflow.com/questions/1094841/reusable-library-to-get-human-readable-version-of-file-size
def sizeof_fmt(num, suffix='B'):
    for unit in ['','Ki','Mi','Gi','Ti','Pi','Ei','Zi']:
        if abs(num) < 1024.0:
            return "%3.1f%s%s" % (num, unit, suffix)
        num /= 1024.0
    return "%.1f%s%s" % (num, 'Yi', suffix)

def count_fmt(num, suffix=''):
    for unit in ['','K','M','B','T']:
        if abs(num) < 1000.0:
            return "%3.1f%s%s" % (num, unit, suffix)
        num /= 1000.0
    return "%.1f%s%s" % (num, 'Z', suffix)

def format_bytes(w):
    return sizeof_fmt(w)

def format_count(w):
    return count_fmt(w)

class StatsBox(UIComponent, pudgy.MustacheComponent):
    def __prepare__(self):
        if self.context.count:
            self.context.object_size = format_bytes(self.context.storageSize / self.context.count)
            self.context.count = format_count(self.context.count)
            self.context.storageSize = format_bytes(self.context.storageSize)

class QueryControls(UIComponent, pudgy.JinjaComponent):
    pass

class QuerySidebar(UIComponent, pudgy.BackboneComponent, pudgy.JinjaComponent, pudgy.SassComponent, pudgy.ServerBridge, pudgy.Pagelet):
    NAMESPACE="views"
    def __prepare__(self):
        from ..views import get_column_types
        self.context.querycontrols = QueryControls(controls=self.context.view.get_controls())
        self.context.viewcontrols = self.context.view.get_view_control()

        self.context.filters = self.context.view.get_filters(self.context.filters)
        self.context.compare_filters = self.context.view.get_filters(self.context.compare_filters)

        self.context.stats = StatsBox(**self.context.metadata)

        fields, types = get_column_types(self.context.metadata)
        self.marshal(fields=fields, types=types,
            supports_compare=self.context.view.SUPPORT_COMPARE_QUERIES)
