import pudgy
from snorkel.views import ViewBase, get_column_types
from snorkel.components import Table
import os

import dotmap
import numbers

class TableView(ViewBase, pudgy.BackboneComponent, pudgy.SassComponent):
    NAME="table"
    BASE="table"
    DISPLAY_NAME="Table View"
    BASE_DIR=os.path.dirname(__file__)



    def __render__(self):
        return ""
