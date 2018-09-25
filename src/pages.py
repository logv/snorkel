import pudgy
import flask

from .components import *
from .views import TableView, get_view_by_name
from .components import QuerySidebar
from .presenter import DatasetPresenter

from . import backend
from .components import UIComponent

import werkzeug
import os

from .query_spec import QuerySpec

class ViewArea(UIComponent, pudgy.JinjaComponent, pudgy.BackboneComponent):
    pass

@pudgy.Virtual
class Page(pudgy.FlaskPage):
    NAMESPACE = "pages"

class HomePage(Page, pudgy.SassComponent):
    def __prepare__(self):
        bs = backend.SybilBackend()
        self.context.tables = bs.list_tables()


class QueryPage(Page, pudgy.SassComponent, pudgy.BackboneComponent):
    def __prepare__(self):
        # locate the potential views
        query = QuerySpec(flask.request.args)

        table = self.context.table
        view = query.get('view', 'table')


        presenter = DatasetPresenter(table=table)

        bs = backend.SybilBackend()

        table_info = bs.get_table_info(table)
        tables = bs.list_tables()

        table_selector = Selector(name="table", selected=table, options=tables)

        VwClass = get_view_by_name(view)
        view = VwClass()
        view.context.update(metadata=table_info, presenter=presenter, query=query)
        # its up to a view to decide on marshalling its data to client,
        # but we auto marshal the table metadata and query for every view
        view.marshal(metadata=table_info, query=query)

        viewarea = ViewArea()

        import ast

        filters = []
        try:
            filters = query.get('filters')
            filters = ast.literal_eval(filters)
            filters = filters['query']
        except Exception as e:
            print e


        qs = QuerySidebar(info=table_info, view=view, filters=filters or [], metadata=table_info)
        qs.async()
        qs.marshal(table=table, viewarea=viewarea)

        self.marshal(sidebar=qs)

        self.context.update(
            table=table,
            sidebar=qs,
            viewarea=viewarea,
            table_selector=table_selector)

# TODO: place these on QueryPage?
@QuerySidebar.api
def run_query(cls, table=None, query=None, viewarea=None, filters=[]):
    # this is a name/value encoded array, unfortunately
    query = QuerySpec(query)
    query.add('table', table)
    query.add('filters', filters)
    d = query.__makedict__()

    bs = backend.SybilBackend()

    ti = bs.get_table_info(table)

    view = query.get('view')
    VwClass = get_view_by_name(view)
    query.set('view', VwClass.BASE)
    res = bs.run_query(table, query, ti)

    v = VwClass()
    v.context.update(query=query, results=res, metadata=ti)
    v.marshal(query=query, results=res, metadata=ti)

    if viewarea:
        viewarea.html(v.render())

    return {
        "queryUrl": flask.url_for('get_view', **d),
        "res" : res,
        "query" : d
    }

@QuerySidebar.api
def update_controls(cls, table=None, view=None, query=None, viewarea=None, filters=[]):
    p = DatasetPresenter(table=table)

    bs = backend.SybilBackend()
    ti = bs.get_table_info(table)

    query = QuerySpec(query)

    VwClass = get_view_by_name(view)

    v = VwClass()
    v.context.update(metadata=ti, presenter=p, query=query)
    query_filters= filters['query']

    qs = QuerySidebar(view=v, presenter=p, query=query, filters=query_filters, metadata=ti)
    qs.marshal(table=table, viewarea=viewarea)

    # we undelegate our events because we are about to replace ourself
    # with the same component
    cls.call("undelegateEvents")
    cls.replace_html(qs.render())

