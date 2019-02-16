from __future__ import absolute_import
import pudgy

from snorkel.views import ViewBase
from snorkel.components import *

from .dist import DistView
import os

class GroupedDist(DistView):
    NAME="grouped_dist"
    BASE="dist"
    DISPLAY_NAME="Grouped Dist"
    BASE_DIR=os.path.dirname(__file__)
    SUPPORT_COMPARE_QUERIES = False

    def get_controls(self):
        controls = super(GroupedDist, self).get_controls()

        self.add_groupby_selector(controls)

        return controls
