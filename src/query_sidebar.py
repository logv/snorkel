import pudgy

from .query_spec import QuerySpec
from . import backend

from .presenter import DatasetPresenter
from .components import UIComponent

from . import views
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
        self.context.object_size = format_bytes(self.context.storageSize / self.context.count)
        self.context.count = format_count(self.context.count)
        self.context.storageSize = format_bytes(self.context.storageSize)

class QuerySidebar(UIComponent, pudgy.BackboneComponent, pudgy.JinjaComponent, pudgy.SassComponent, pudgy.ServerBridge, pudgy.Pagelet):
    def __prepare__(self):
        self.context.controls = self.context.view.get_controls()
        self.context.filters = self.context.view.get_filters(self.context.filters)

        print self.context.metadata

        self.context.stats = StatsBox(**self.context.metadata.toDict())

@QuerySidebar.api
def run_query(cls, table=None, query=None, viewarea=None, filters=[]):
    # this is a name/value encoded array, unfortunately
    query = QuerySpec(query)
    bs = backend.SybilBackend()

    ti = bs.get_table_info(table)
    query.add('table', table)
    query.add('filters', filters)

    view = query.get('view')


    res = bs.run_query(table, query, ti)

    VwClass = views.get_view_by_name(view)
    v = VwClass()
    v.context.update(query=query, results=res, metadata=ti)

    if viewarea:
        viewarea.html(v.render())

    return {
        "queryUrl": flask.url_for('get_view', **query),
        "res" : res,
        "query" : query
    }

@QuerySidebar.api
def update_controls(cls, table=None, view=None, query=None, viewarea=None, filters=[]):
    p = DatasetPresenter(table=table)

    bs = backend.SybilBackend()
    ti = bs.get_table_info(table)

    query = QuerySpec(query)

    VwClass = views.get_view_by_name(view)

    v = VwClass()
    v.context.update(metadata=ti, presenter=p, query=query)
    query_filters= filters['query']

    qs = QuerySidebar(view=v, presenter=p, query=query, filters=query_filters, metadata=ti)
    qs.marshal(table=table, viewarea=viewarea)

    # we undelegate our events because we are about to replace ourself
    # with the same component
    cls.call("undelegateEvents")
    cls.replace_html(qs.render())
