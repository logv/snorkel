
import pudgy

from snorkel.views import ViewBase
from snorkel.components import *

from ..snorkel_basic_views import TableView
import os

class DrilldownView(TableView):
    NAME="drilldown"
    BASE="table"
    DISPLAY_NAME="Drilldown View"
    BASE_DIR=os.path.dirname(__file__)
