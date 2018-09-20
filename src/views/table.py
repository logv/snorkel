import pudgy
from .view import ViewBase

class TableView(ViewBase, pudgy.JSComponent, pudgy.MustacheComponent):
    NAME="table"
    BASE="table"
    DISPLAY_NAME="Table View"

    def __prepare__(self):
        table = []
        for r in self.context.results:
            row = []
            for c in r:
                row.append(r[c])

            table.append(row)

        self.context.table = table

