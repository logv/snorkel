import sys

from .. import components
from .view import ViewBase
from .view import get_view_by_name, get_column_types

## SETUP PLUGINS HERE
import dotmap

snorkel = dotmap.DotMap({ "views" : sys.modules[__name__], "components" : components})
sys.modules["snorkel"] = snorkel
sys.modules["snorkel.views"] = snorkel.views
sys.modules["snorkel.components"] = snorkel.components
