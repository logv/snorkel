import pudgy
from .view import ViewBase, get_column_types
from ..components import Table

import dotmap
import numbers

class TableView(ViewBase, pudgy.BackboneComponent, pudgy.SassComponent):
    NAME="table"
    BASE="table"
    DISPLAY_NAME="Table View"



    def __render__(self):
        return ""
