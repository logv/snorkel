import pudgy
import os

from snorkel.components import Selector, ControlRow
from snorkel.views import ViewBase

import sys

from ..snorkel_basic_views import TimeView

def make_dict(arr):
    return dict([(w,w) for w in arr])

# this line lets us access TimeView's modules via prefix
pudgy.components.add_dirhash_alias("timeview", TimeView)
class WecoView(TimeView, pudgy.JSComponent, pudgy.SassComponent):
    NAME="weco"
    BASE="time"
    DISPLAY_NAME="Weco View"
    BASE_DIR=os.path.dirname(__file__)

