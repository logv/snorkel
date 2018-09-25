import pudgy
from .view import ViewBase, get_column_types
from ..components import Table

class TableView(ViewBase, pudgy.JSComponent,
    pudgy.MustacheComponent, pudgy.SassComponent):
    NAME="table"
    BASE="table"
    DISPLAY_NAME="Table View"

    def __prepare__(self):
        headers = []
        md = self.context.metadata

        query = self.context.query
        for s in query.getlist("groupby[]"):
            headers.append(s)

        headers.extend(["Samples", "Count"])

        for s in query.getlist("fields[]"):
            headers.append(s)

        fields, types = get_column_types(md)


        agg = query.get("metric")

        table = []
        for r in self.context.results:
            row = []
            for h in headers:
                if h not in types or h == "Count" or h == "Samples":
                    row.append(r[h] or "")
                    continue

                if types[h] == "integer":
                    f = r[h]
                    if agg[0] == "p":
                        p = int(agg[1:])
                        row.append(r[h]['percentiles'][p])

                    elif agg == "Sum":
                        if type(r[h]) == dict:
                            row.append(r[h]["avg"] * r["Count"] or "")
                        else:
                            row.append(r[h] * r["Count"] or "")

                    elif agg == "Avg":
                        if type(r[h]) == dict:
                            row.append(r[h]["avg"])
                        else:
                            row.append(r[h]or "")

                    elif agg == "Count":
                        row.append(r["Count"])
                else:
                    row.append(r[h] or "")



            table.append(row)

        self.context.table = table
        self.context.headers = headers

    def __render__(self):
        t = Table()
        t.context.update(**self.context.toDict())

        r = t.render()
        return r
