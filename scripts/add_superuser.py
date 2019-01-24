from getpass import getpass
import importlib
import sys
import os

if len(sys.argv) != 2:
    print "Usage: ./%s <username>" % (sys.argv[0])
    sys.exit(0)

dir = os.path.join(os.path.dirname(__file__), "..", "src")
sys.path.append(dir)

from flask_security.datastore import PeeweeUserDatastore
from models import User, Role, UserRoles, userdb


user_datastore = PeeweeUserDatastore(userdb, User, Role, UserRoles)
name = sys.argv[1]
try:
    user = User.get(User.email == name)
    print "User '%s' already exists" % name

    while True:
        r = raw_input("Make user a superuser? [y/N]").lower()
        if r == "y":
            role = user_datastore.find_role('superuser')
            if not role:
                user_datastore.create_role('superuser')
            user_datastore.add_role_to_user(user, role)
            user.save()
            print "Set user '%s' to superuser" % name
            break
        elif r == "n":
            break


except User.DoesNotExist:
    pw = getpass()
    user = User.create(username=name, email=name, password=pw, roles=['superuser'])
    role = user_datastore.find_role('superuser')
    if not role:
        user_datastore.create_role('superuser')
    user.save()
    print "Created user", name
