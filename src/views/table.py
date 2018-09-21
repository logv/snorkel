import pudgy
from .view import ViewBase

class TableView(ViewBase, pudgy.JSComponent,
    pudgy.MustacheComponent, pudgy.SassComponent):
    NAME="table"
    BASE="table"
    DISPLAY_NAME="Table View"

    def __prepare__(self):
        headers = []
        md = self.context.metadata
        print "METADATA", md

        query = self.context.query
        for s in query.getlist("groupby[]"):
            headers.append(s)

        headers.extend(["Samples", "Count"])

        for s in query.getlist("fields[]"):
            headers.append(s)



        table = []
        for r in self.context.results:
            row = []
            for h in headers:
                row.append(r[h] or "")

            table.append(row)

        self.context.table = table
        self.context.headers = headers

