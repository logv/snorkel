import pudgy
import flask

from .views import get_view_by_name
from .components import QuerySidebar, UserButton, UserModal
from .presenter import DatasetPresenter

from . import backend, results
from .components import UIComponent, Selector

import werkzeug
import os

import flask_security

from .query_spec import QuerySpec
from .errors import ServerError

class ViewArea(UIComponent, pudgy.JinjaComponent, pudgy.BackboneComponent):
    pass

@pudgy.Virtual
class Page(pudgy.FlaskPage):
    NAMESPACE = "pages"

class HomePage(Page, pudgy.SassComponent):
    pass

class DatasetsPage(Page, pudgy.SassComponent):
    def __prepare__(self):
        bs = backend.SybilBackend()
        self.context.tables = bs.list_tables()
        self.context.tables = list(self.context.tables)
        self.context.tables.sort()

        self.context.user_button = UserButton()
        self.context.user_modal = UserModal()


def read_filters(query):
    import ast

    filters = []
    try:
        filters = query.get('filters')
        if type(filters) == str:
            filters = ast.literal_eval(filters)

        filters = filters['query']
    except Exception as e:
        print "FILTER ERR", e

    return filters


class QueryPage(Page, pudgy.SassComponent, pudgy.BackboneComponent, pudgy.ServerBridge):
    def __prepare__(self):
        # locate the potential views
        query = QuerySpec(flask.request.args)
        self.context.error = None
        if "saved" in self.context and self.context.saved:
            query = QuerySpec(self.context.saved.parsed)


        table = self.context.table
        view = query.get('view', 'table')

        presenter = DatasetPresenter(table=table)

        bs = backend.SybilBackend()

        try:
            table_info = bs.get_table_info(table)
            tables = bs.list_tables()
        except Exception as e:
            self.context.error = "Couldn't read table info for table %s" % (table)
	    return


        table_selector = Selector(name="table", selected=table, options=tables)

        VwClass = get_view_by_name(view)
        view = VwClass()
        view.context.update(metadata=table_info, presenter=presenter, query=query)
        # its up to a view to decide on marshalling its data to client,
        # but we auto marshal the table metadata and query for every view
        view.marshal(metadata=table_info, query=query)

        viewarea = ViewArea()
        if self.context.saved:
            sq = self.context.saved
            view.context.update(sq.parsed, results=sq.results)
            view.marshal(query=sq.parsed, results=sq.results)
            viewarea.context.update(view=view)

        filters = read_filters(query)

        qs = QuerySidebar(info=table_info, view=view, filters=filters or [], metadata=table_info)

        qs.set_ref("sidebar")
        qs.marshal(table=table, viewarea=viewarea, metadata=table_info)


        user_button = UserButton()
        user_modal = UserModal()

        self.marshal(sidebar=qs, table=table, user_modal=user_modal)

        self.context.update(
            table=table,
            sidebar=qs,
            user_button=user_button,
            user_modal=user_modal,
            viewarea=viewarea,
            table_selector=table_selector)

# TODO: place these on QueryPage?
@QuerySidebar.api
@flask_security.login_required
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
    query.set('viewbase', VwClass.BASE)
    res = bs.run_query(table, query, ti)

    sq = results.save_for_user(flask_security.core.current_user, query, res)

    d["h"] = sq.hashid

    v = VwClass()
    v.context.update(query=sq.parsed, results=sq.results, metadata=ti)
    v.marshal(query=sq.parsed, results=sq.results, metadata=ti)

    if viewarea:
        viewarea.html(v.render())

    return {
        "queryUrl": flask.url_for('get_view', **d),
        "res" : res,
        "query" : d
    }

@QuerySidebar.api
@flask_security.login_required
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
    qs.__prepare__()
    qs.nomarshal()
    # we undelegate our events because we are about to replace ourself
    # with the same component
    cls.html(qs.context.querycontrols.render(), selector=".querycontrols")

@QueryPage.api
@flask_security.login_required
def get_saved_queries(cls, table=None):
    user = flask_security.core.current_user

    if table:
        recent_queries = results.get_for_user(user, table)

    return {
        "recent" : recent_queries,
        "table" : table

    }
