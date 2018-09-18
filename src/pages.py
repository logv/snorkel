import pudgy
import dotmap

from .components import *
from . import backend

class HomePage(pudgy.FlaskPage):
    def __prepare__(self):
        bs = backend.SybilBackend()
        self.context.tables = bs.list_tables()


class QueryPage(pudgy.FlaskPage):
    def __prepare__(self):
        # locate the potential views
        table = self.context.table
        view = self.context.view

        bs = backend.SybilBackend()
        table_info = bs.get_table_info(table)

        view = TableView()
        view.context.update(info=table_info)

        qs = QuerySidebar(info=table_info, view=view)


        self.context.update(
            info=table_info,
            table=table,
            sidebar=qs,
            view=view)
