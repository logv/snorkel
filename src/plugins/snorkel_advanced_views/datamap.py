import pudgy

from snorkel.views import ViewBase
from snorkel.components import *

from ..snorkel_basic_views import TableView
import os

class MapView(TableView, pudgy.ServerBridge):
    NAME="map"
    BASE="table"
    DISPLAY_NAME="Map View"
    BASE_DIR=os.path.dirname(__file__)
    SUPPORT_COMPARE_QUERIES=False

    def add_map_controls(self, controls):
        def make_dict(arr):
            return dict([(w,w) for w in arr])

        bubble_size = Selector(
            name="bubble_size",
            options= [ ("Variable", "var"), ("Equal", "equal") ],
            selected=self.context.query.get('bubble_size', ''))

        group_type = Selector(
            name="group_type",
            options= [
                ("Country Name", "country"),
                ("2 Letter Country Code", "country2"),
                ("3 Letter Country Code", "country3"),
                ("2 Letter State Code", "state"),
                ("IP Address", "ip"),
            ],
            selected=self.context.query.get('group_type', ''))

        scope = Selector(
            name="scope",
            options= [
                ("World", "world"),
                ("USA", "usa")
            ],
            selected=self.context.query.get('scope', ''))

        controls.append(ControlRow("bubble_size", "Bubble Size", bubble_size))
        controls.append(ControlRow("group_type", "Group Type", group_type))
        controls.append(ControlRow("scope", "Scope", scope))


    def get_controls(self):
        controls = super(MapView, self).get_controls()

        self.add_map_controls(controls)

        return controls

@MapView.api
def load_geoips(cls, ips):
    from geoip import geolite2

    ret = {}
    for ip in ips:
        m = geolite2.lookup(ip)
        if not m:
            continue

        r = {}

        r = m.to_dict()
        for k,v in r.items():
            if isinstance(v, frozenset):
                r[k] = list(v)

        ret[ip] = r

    return ret

