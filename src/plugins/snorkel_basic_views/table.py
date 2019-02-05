import pudgy
from snorkel.views import ViewBase, get_column_types
from snorkel.components import Table
import os

import numbers

class TableView(ViewBase, pudgy.BackboneComponent, pudgy.SassComponent):
    NAME="table"
    BASE="table"
    DISPLAY_NAME="Table View"
    BASE_DIR=os.path.dirname(__file__)
    SUPPORT_COMPARE_QUERIES=True

    def __render__(self):
        return ""
