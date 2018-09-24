import werkzeug
import json

class QuerySpec(object):
    def __init__(self, query):
        # we list all attributes of a query spec up front so others know what
        # to expect
        md = werkzeug.MultiDict()
        for q in query:
            if type(q) == dict:
                md.add(q['name'], q['value'].strip())
            elif type(q) == list or type(q) == tuple:
                md.add(q[0], q[1].strip())
            else:
                md.add(q, query[q])


        self.md = md
        self.fields = md.getlist('fields[]')
        self.groupby = md.getlist('groupby[]')

    def __makedict__(self):
        ret = {
        
        
        }
        for f in self.md:
            if f.endswith("[]"):
                ret[f] = self.md.getlist(f)
            else:
                ret[f] = self.md.get(f)

        return ret

    def __json__(self):
        return self.__makedict__()

    def add(self, k, v):
        self.md.add(k, v)

    def getlist(self, k, d=[]):
        return self.md.getlist(k)

    def get(self, k, d=None):
        return self.md.get(k, d)

