import werkzeug

def QuerySpec(query):
    md = werkzeug.MultiDict()
    for q in query:
        if type(q) == dict:
            md.add(q['name'], q['value'].strip())
        elif type(q) == list or type(q) == tuple:
            md.add(q[0], q[1].strip())

    return md

