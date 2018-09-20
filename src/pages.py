import pudgy
import flask

from .components import *
from .views import TableView
from .query_sidebar import QuerySidebar
from .presenter import DatasetPresenter

from . import backend

import werkzeug

class ViewArea(pudgy.JinjaComponent, pudgy.BackboneComponent):
    pass

class HomePage(pudgy.FlaskPage):
    def __prepare__(self):
        bs = backend.SybilBackend()
        self.context.tables = bs.list_tables()


class QueryPage(pudgy.FlaskPage, pudgy.SassComponent, pudgy.BackboneComponent):
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

        view = TableView()
        view.context.update(info=table_info, presenter=presenter, query=query)

        viewarea = ViewArea()

        qs = QuerySidebar(info=table_info, view=view)
        qs.marshal(table=table, viewarea=viewarea)

        self.marshal(sidebar=qs)

        self.context.update(
            table=table,
            sidebar=qs,
            viewarea=viewarea,
            table_selector=table_selector)
