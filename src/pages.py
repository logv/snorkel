from __future__ import print_function
import pudgy
import flask
import time

from .views import get_view_by_name
from .components import QuerySidebar, UserButton, UserModal
from .auth import rpc_login_required

from . import backend, results, presenter, rbac
from .components import UIComponent, Selector

import werkzeug
import os
from collections import defaultdict

import flask_security

from .query_spec import QuerySpec

from .util import time_to_seconds, string_dict

try:
    from urllib import unquote_plus
except:
    from urllib.parse import unquote_plus

from . import fastjson as json

class ViewArea(UIComponent, pudgy.JinjaComponent, pudgy.BackboneComponent, pudgy.ClientBridge):
    pass

@pudgy.Virtual
class Page(pudgy.FlaskPage):
    NAMESPACE = "pages"

class HomePage(Page, pudgy.SassComponent):
    pass

class UserPage(Page):
    pass

class DatasetsPage(Page, pudgy.BackboneComponent, pudgy.SassComponent):
    def __prepare__(self):
        bs = backend.SybilBackend()
        self.context.tables = filter(lambda t: rbac.check("query", t), bs.list_tables())


        self.context.tables = list(self.context.tables)
        self.context.tables.sort()
        groups = defaultdict(list)

        self.context.table_groups = groups

        groupings = []
        visited = {}
        for t in self.context.tables:
            if t in visited:
                continue

            visited[t] = 1

            tokens = t.split("@")
            if len(tokens) > 1:
                superset = tokens[0]
                dataset = " ".join(tokens[1:])
                groups[superset].append(dataset)
            else:
                groups[t].append("")


        self.context.groups = list(sorted(groups.keys()))
        self.context.user_button = UserButton()
        self.context.user_modal = UserModal()


def read_filters(query, i='query'):
    import ast

    filters = []
    try:
        filters = query.get('filters')
        if type(filters) == str:
            filters = ast.literal_eval(filters)

        filters = filters[i]
    except Exception as e:
        print("FILTER ERR", e)

    return filters


import datetime
def epoch(d):
    return (d - datetime.datetime(1970, 1, 1)).total_seconds()

class QueryPage(Page, pudgy.SassComponent, pudgy.BackboneComponent, pudgy.ServerBridge):
    def __prepare__(self):
        # locate the potential views
        query = QuerySpec(flask.request.args)
        self.context.error = None
        has_saved = False
        if "saved" in self.context and self.context.saved:
            query = QuerySpec(self.context.saved.parsed)
            has_saved = True


        table = self.context.table
        view = query.get('view', 'table')

        pr = presenter.GetPresenter(table)

        bs = backend.SybilBackend()
        bs.clear_cache(table=table)

        try:
            table_info = bs.get_table_info(table)
            tables = filter(lambda t: rbac.check("query", t), bs.list_tables())
        except Exception as e:
            self.context.error = "Couldn't read table info for table %s" % (table)
            return


        table_selector = Selector(name="table", selected=table, options=tables)

        VwClass = get_view_by_name(view)
        view = VwClass()
        view.context.update(metadata=table_info, presenter=pr, query=query)
        # its up to a view to decide on marshalling its data to client,
        # but we auto marshal the table metadata and query for every view
        view.marshal(metadata=table_info, query=query)

        viewarea = ViewArea()
        if self.context.saved:
            sq = self.context.saved

            if not sq.results:
                viewarea.call("no_results", {
                    "errmsg" : "No results found for this query"
                });
            view.context.update(sq.parsed, results=sq.results, compare=sq.compare)
            view.marshal(query=sq.parsed, results=sq.results, compare=sq.compare,
                parsed=sq.parsed, created=epoch(sq.created))

            viewarea.call("set_view", view)
            viewarea.context.update(view=view)

        filters = read_filters(query)
        compare_filters = read_filters(query, 'compare')

        qs = QuerySidebar(info=table_info, view=view, filters=filters or [],
            compare_filters=compare_filters, metadata=table_info)

        if compare_filters:
            qs.call('show_compare_filters')

        qs.call("supports_compare_filters", view.SUPPORT_COMPARE_QUERIES)
        if has_saved:
            qs.call("show_results")

        qs.set_ref("sidebar")
        qs.marshal(table=table, viewarea=viewarea, metadata=table_info)

        self.set_ref("querypage")


        user_button = UserButton()
        user_modal = UserModal(show_queries=True)

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
@rpc_login_required
def run_query(cls, table=None, query=None, viewarea=None, filters=[]):
    if not rbac.check("query", table):
        return {
            "error" : "You don't have access to this table"
        }

    user = flask_security.core.current_user.email
    # this is a name/value encoded array, unfortunately
    query = QuerySpec(query)
    query.add('table', table)
    query.add('filters', string_dict(filters))
    d = query.__makedict__()

    bs = backend.SybilBackend()

    ti = bs.get_table_info(table)

    view = query.get('view')
    VwClass = get_view_by_name(view)

    # this lets a class modify the parameters to a query using
    # its own custom params
    VwClass.add_custom_params(query)
    query.set('viewbase', VwClass.BASE)

    res = bs.run_query(table, query, ti)
    bs.log_query(user, query)

    cmp = None
    against = query.get('against', '')
    filters = query.get('filters')

    compare_filters = filters['compare']
    if against or len(compare_filters):
        compare_spec = QuerySpec(query.md)

        if against:
            now = time_to_seconds('now')
            compare_delta = time_to_seconds(against) - now

            # compare_delta is in ms
            query.set('compare_delta', compare_delta*1000)

            startms = query.get('start_ms')
            endms = query.get('end_ms')

            startms += compare_delta * 1000
            endms += compare_delta * 1000

            compare_spec.set('start_ms', startms)
            compare_spec.set('end_ms', endms)


        compare_spec.set('filters', { "query" : compare_filters })

        cmp = bs.run_query(table, compare_spec, ti)
        query.set('compare_mode', 1)

        bs.log_query(user, compare_spec)

    sq = results.save_for_user(flask_security.core.current_user, query, res, cmp)

    d["h"] = sq.hashid

    v = VwClass()
    v.context.update(query=sq.parsed, results=sq.results, metadata=ti, compare=sq.compare)
    v.marshal(query=sq.parsed, results=sq.results, compare=sq.compare, metadata=ti, parsed=epoch(sq.created))

    if viewarea:
        if not res:
            viewarea.call("no_results", {
                "errmsg" : "No results found for this query"
            });
        viewarea.html(v.render())
        # viewarea.call("set_view", v)


    d['filters'] = json.dumps(d['filters'])
    queryUrl = unquote_plus(flask.url_for('get_view', **d))
    return {
        "queryUrl": queryUrl,
        "res" : res,
        "cmp" : cmp,
        "query" : d
    }

@QuerySidebar.api
@rpc_login_required
def update_controls(cls, table=None, view=None, query=None, viewarea=None, filters=[]):
    pr = presenter.GetPresenter(table)

    bs = backend.SybilBackend()
    ti = bs.get_table_info(table)

    query = QuerySpec(query)

    VwClass = get_view_by_name(view)

    v = VwClass()
    v.context.update(metadata=ti, presenter=pr, query=query)
    query_filters= filters['query']

    qs = QuerySidebar(view=v, presenter=pr, query=query, filters=query_filters, metadata=ti)
    qs.__prepare__()
    qs.nomarshal()

    has_compare_filters = 'compare' in filters and len(filters['compare']) > 0
    if v.SUPPORT_COMPARE_QUERIES and has_compare_filters:
        cls.call("show_compare_filters")
    else:
        cls.call("hide_compare_filters")
    cls.call("supports_compare_filters", v.SUPPORT_COMPARE_QUERIES)

    # we undelegate our events because we are about to replace ourself
    # with the same component
    cls.html(qs.context.querycontrols.render(), selector=".querycontrols")

@QueryPage.api
@rpc_login_required
def get_saved_queries(cls, table=None):
    user = flask_security.core.current_user

    if table:
        recent_queries = results.get_for_user(user, table)

    return {
        "recent" : recent_queries,
        "table" : table

    }
