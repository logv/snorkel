try:
    import cjson
    loads = cjson.decode
    dumps = cjson.encode
except:
    import json
    loads = json.loads
    dumps = json.dumps

