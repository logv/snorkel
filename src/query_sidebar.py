import pudgy

from .query_spec import QuerySpec
from . import backend

from .presenter import DatasetPresenter
from .components import UIComponent

from . import views
import flask

class QuerySidebar(UIComponent, pudgy.BackboneComponent, pudgy.JinjaComponent, pudgy.SassComponent, pudgy.ServerBridge, pudgy.Pagelet):
    def __prepare__(self):
        self.context.controls = self.context.view.get_controls()
        print "FILTERS", self.context.filters
        self.context.filters = self.context.view.get_filters(self.context.filters)

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

    qs = QuerySidebar(view=v, presenter=p, query=query, filters=query_filters)
    qs.marshal(table=table, viewarea=viewarea)

    # we undelegate our events because we are about to replace ourself
    # with the same component
    cls.call("undelegateEvents")
    cls.replace_html(qs.render())
