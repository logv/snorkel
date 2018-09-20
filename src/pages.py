import pudgy
import dotmap

from .components import *
from .view import TableView, DatasetPresenter, QuerySidebar

from . import backend

import werkzeug

class ViewArea(pudgy.JinjaComponent, pudgy.BackboneComponent):
    pass

class HomePage(pudgy.FlaskPage):
    def __prepare__(self):
        bs = backend.SybilBackend()
        self.context.tables = bs.list_tables()


class QueryPage(pudgy.FlaskPage):
    def __prepare__(self):
        # locate the potential views
        table = self.context.table
        view = self.context.view

        presenter = DatasetPresenter(table=table)

        bs = backend.SybilBackend()
        table_info = bs.get_table_info(table)

        query = werkzeug.MultiDict({})

        view = TableView()
        view.context.update(info=table_info, presenter=presenter, query=query)

        viewarea = ViewArea()


        qs = QuerySidebar(info=table_info, view=view)
        qs.marshal(table=table, viewarea=viewarea)
        self.context.update(table=table, sidebar=qs, viewarea=viewarea)
