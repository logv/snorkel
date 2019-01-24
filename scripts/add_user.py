from getpass import getpass
import importlib
import sys
import os

if len(sys.argv) != 2:
    print "Usage: ./%s <username>" % (sys.argv[0])
    sys.exit(0)

dir = os.path.join(os.path.dirname(__file__), "..", "src")
sys.path.append(dir)

from models import User

name = sys.argv[1]
try:
    user = User.get(User.email == name)
    print "User '%s' already exists" % name
except User.DoesNotExist:
    pw = getpass()
    user = User.create(email=name, password=pw)
    user.save()
    print "Created user", name
