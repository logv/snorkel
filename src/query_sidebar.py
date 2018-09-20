import pudgy

from .query_spec import QuerySpec
from . import backend

from .presenter import DatasetPresenter

from . import views


class QuerySidebar(pudgy.BackboneComponent, pudgy.JinjaComponent, pudgy.SassComponent, pudgy.ServerBridge):
    def __prepare__(self):
        self.context.controls = self.context.view.get_controls()

@QuerySidebar.api
def run_query(cls, table=None, query=None, viewarea=None):
    # this is a name/value encoded array, unfortunately
    qs = QuerySpec(query)
    view = qs.get('view')

    bs = backend.SybilBackend()
    res = bs.run_query(table, qs)

    r =  { "query" : qs.to_dict(flat=False), "results" : res }

    VwClass = views.get_view_by_name(view)
    v = VwClass()
    v.context.update(query=query, results=res)

    if viewarea:
        viewarea.replace_html(v.render())

@QuerySidebar.api
def update_controls(cls, table=None, view=None, query=None, viewarea=None):
    p = DatasetPresenter(table=table)

    bs = backend.SybilBackend()
    ti = bs.get_table_info(table)

    query = QuerySpec(query)

    VwClass = views.get_view_by_name(view)

    v = VwClass()
    v.context.update(info=ti, presenter=p, query=query)

    qs = QuerySidebar(view=v, presenter=p, query=query)
    qs.marshal(table=table, viewarea=viewarea)

    # we undelegate our events because we are about to replace ourself
    # with the same component
    cls.call("undelegateEvents")
    cls.replace_html(qs.render())
