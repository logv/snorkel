import werkzeug
try:
    import dotmap
except:
    dotmap = None

try:
    import addict
except:
    addict = None

class QuerySpec(object):
    def __init__(self, query):
        # TODO: list all attributes of a query spec up front so others know what to expect

        md = werkzeug.MultiDict()
        for q in query:
            if type(q) == dict:
                md.add(q['name'], q['value'].strip())
            elif type(q) == list or type(q) == tuple:
                md.add(q[0], q[1].strip())
            else:
                md.add(q, query[q])

        self.ismultidict = False
        self.isdotmap = False
        if isinstance(query, werkzeug.MultiDict):
            self.ismultidict = True
        elif addict and isinstance(query, addict.Dict):
            self.isdotmap = True
        elif dotmap and isinstance(query, dotmap.DotMap):
            self.isdotmap = True
        elif isinstance(query, list):
            self.ismultidict = True
        else:
            raise Exception("Unknown entry for query spec")

        self.md = md

        # we will need to put together an exported interface
        self.fields = self.get_fields()
        self.groupby = self.get_groupby()

    def __makedict__(self):
        ret = {


        }
        for f in self.md:
            if f.endswith("[]"):
                if self.ismultidict:
                    ret[f] = self.md.getlist(f)
                else:
                    ret[f] = self.md.get(f)

            else:
                ret[f] = self.md.get(f)

        return ret

    def __json__(self):
        return self.__makedict__()

    def setlist(self, k, v):
        self.md.setlist(k, v)

    def set(self, k, v):
        if k in self.md:
            self.md.pop(k)
        self.md.add(k,v)

    def add(self, k, v):
        self.md.add(k, v)

    def getlist(self, k, d=[]):
        if self.ismultidict:
            return self.md.getlist(k)

        return self.md.get(k) or []



    def get(self, k, d=None):
        return self.md.get(k, d)

    def get_metric(self):
        op = self.md.get('metric')
        if not op:
            op = self.md.get('agg', '')
            op = op.lstrip("$")

        return op

    def get_groupby(self):
        g = self.getlist('groupby[]')
        if not g:
            g = self.getlist('group_by')

        return g

    def get_fields(self):
        g = self.getlist('fields[]')
        if not g:
            g = self.getlist('fieldset')

        return g

    def get_custom_fields(self):
        g = self.getlist('custom_fields[]')
        if not g:
            g = self.getlist('custom_fields')

        return g

