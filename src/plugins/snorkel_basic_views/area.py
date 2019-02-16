from __future__ import absolute_import
import pudgy

from snorkel.views import ViewBase
from snorkel.components import *

from .time import TimeView
import os

class AreaView(TimeView):
    NAME="area"
    BASE="time"
    DISPLAY_NAME="Stacked Area View"
    BASE_DIR=os.path.dirname(__file__)
