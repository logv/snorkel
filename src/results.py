from .models import SavedQuery
from pudgy.util  import getrandhash
from . import fastjson as json
from . import presenter

def save_for_user(user, params, results, compare={}):
    table = params.get('table')

    table = presenter.GetRealTable(table)

    params = params.__json__()
    hashid = getrandhash(json.dumps(params))
    hashid = hashid[:10]
    sq = SavedQuery.create(results=results, user=user.id, parsed=params, hashid=hashid,
        table=table, compare=compare or {})

    return sq

def get_for_user(user, table, limit=30):
    table = presenter.GetRealTable(table)
    res = SavedQuery \
        .select(
            SavedQuery.created,
            SavedQuery.parsed,
            SavedQuery.hashid,
            SavedQuery.user
        ).limit(limit) \
        .order_by(-SavedQuery.created) \
        .where(SavedQuery.user == user.id, SavedQuery.table == table)

    res = res.dicts()

    return list(reversed(res))

def zip_results():
    while True:
        ret = list(SavedQuery.select().where(SavedQuery.zipped == False).limit(10))
        if not ret:
            break

        for r in ret:
            r.zipped = True
            r.save()


def get_by_hashid(hashid):
    return list(SavedQuery.select().where(SavedQuery.hashid == hashid).dicts())

if __name__ == "__main__":
    zip_results()
