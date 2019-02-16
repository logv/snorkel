from __future__ import absolute_import
import pudgy

from snorkel.views import ViewBase
from snorkel.components import *

from .table import TableView
import os

class BarView(TableView):
    NAME="bar"
    BASE="table"
    DISPLAY_NAME="Bar View"
    BASE_DIR=os.path.dirname(__file__)
