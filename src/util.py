import subprocess
from . import fastjson as json


# time translation command is:
# `date -d "<str>" +%s`
def time_to_seconds(timestr):
    cmd_args = ["date", "-d", timestr, "+%s"]
    try:
        output = subprocess.check_output(cmd_args)
    except:
        raise Exception("Unknown time string: ", timestr)
    return int(output)

def time_delta_to_seconds(timedelta):
    now = time_to_seconds("now")
    then = time_to_seconds(timedelta)

    return now - then

def return_json(d):
    return json.dumps(d), 200, {"ContentType" : "application/json"}

# from https://stackoverflow.com/questions/1254454/fastest-way-to-convert-a-dicts-keys-values-from-unicode-to-str
import collections

try:
  basestring
except NameError:
  basestring = str

def convert(data):
    if isinstance(data, basestring):
        return str(data)
    elif isinstance(data, collections.Mapping):
        return dict(map(convert, data.items()))
    elif isinstance(data, collections.Iterable):
        return type(data)(map(convert, data))
    else:
        return data

string_dict = convert
