import pudgy
from snorkel.views import ViewBase, get_column_types
from snorkel.components import Table
import os

class SamplesView(ViewBase, pudgy.JSComponent):
    NAME="samples"
    BASE="samples"
    DISPLAY_NAME="Samples View"
    BASE_DIR=os.path.dirname(__file__)

    def get_controls(self):
        controls = []

        self.add_time_controls(controls)

        self.add_limit_selector(controls)

        self.add_go_button(controls)

        return controls

    def __prepare__(self):
        md = self.context.metadata
        fields, types = get_column_types(md)

        query = self.context.query
        headers = list(fields.keys())
        headers.sort()

        table = []

        for r in self.context.results:
            row = []
            for h in headers:
                row.append(r.get(h, ""))

            table.append(row)

        self.context.table = table
        self.context.headers = headers

    def __render__(self):
        t = Table()
        t.context.update(**self.context)

        r = t.render()

        return r
