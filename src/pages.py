import pudgy
import flask

from .components import *
from .views import TableView, get_view_by_name
from .query_sidebar import QuerySidebar
from .presenter import DatasetPresenter

from . import backend
from .components import UIComponent

import werkzeug
import os

class ViewArea(UIComponent, pudgy.JinjaComponent, pudgy.BackboneComponent):
    pass

class Page(pudgy.FlaskPage):
    BASE_DIR = os.path.join(pudgy.Component.BASE_DIR, "pages")

class HomePage(Page):
    def __prepare__(self):
        bs = backend.SybilBackend()
        self.context.tables = bs.list_tables()


class QueryPage(Page, pudgy.SassComponent, pudgy.BackboneComponent):
    def __prepare__(self):
        # locate the potential views
        query = flask.request.args

        table = self.context.table
        view = self.context.view


        presenter = DatasetPresenter(table=table)

        bs = backend.SybilBackend()

        table_info = bs.get_table_info(table)
        tables = bs.list_tables()

        table_selector = Selector(name="table", selected=table, options=tables)

        VwClass = get_view_by_name(view)
        view = VwClass()
        view.context.update(metadata=table_info, presenter=presenter, query=query)

        viewarea = ViewArea()

        import ast

        filters = []
        try:
            filters = query.get('filters')
            filters = ast.literal_eval(filters)
            filters = filters['query']
        except Exception as e:
            print e


        qs = QuerySidebar(info=table_info, view=view, filters=filters or [])
        qs.async()
        qs.marshal(table=table, viewarea=viewarea)

        self.marshal(sidebar=qs)

        self.context.update(
            table=table,
            sidebar=qs,
            viewarea=viewarea,
            table_selector=table_selector)
