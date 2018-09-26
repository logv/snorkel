import subprocess


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

