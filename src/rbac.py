import fnmatch

from . import config
from flask_security import current_user

class PermGroup(object):
    def __init__(self, name, perms, tables, users):
        self.name = name
        self.perms = perms.split(',')
        self.tables = tables.split(',')
        self.users = users.split(',')

    def __repr__(self):
        return '<%s> perms: %s, tables: %s, users: %s' \
            % (self.name, self.perms, self.tables, self.users)

    # % means to use the perms from the group with %NAME
    # $ means to use the users from the group with $NAME
    # ^ means to use the tables from the group with ^NAME
    def add_subs(self, lookup):
        for u in self.users:
            if u[0] == "%":
                name = u[1:]
                self.perms = lookup[name].perms

            if u[0] == "^":
                name = u[1:]
                self.tables = lookup[name].tables

            if u[0] == "$":
                name = u[1:]
                self.users = lookup[name].users
        pass

    def check(self, perm, table, user):
        has_perm = False
        for p in self.perms:
            if fnmatch.fnmatch(perm, p):
                has_perm = True

        if not has_perm:
            return

        has_user = False
        for u in self.users:
            if fnmatch.fnmatch(user, u):
                has_user = True

        if not has_user:
            return

        for t in self.tables:
            if fnmatch.fnmatch(table, t):
                return True

def parse_perms(lines):
    perm_lookups = {}

    for line in lines:
        line = line.strip()
        if not line or line[0] == '#':
            continue

        tokens = line.split(':')
        pg = PermGroup(*tokens)
        perm_lookups[pg.name] = pg

    for p in perm_lookups:
        pg = perm_lookups[p]
        pg.add_subs(perm_lookups)

    return perm_lookups

def read_rbac_file(fname):
    with open(fname) as f:
        lines = f.readlines()

    return parse_perms(lines)

def check(role, table, user=None):
    # we aren't using RBAC check
    if not config.AUTHORIZED_USERS:
        return True

    if not user and current_user.is_anonymous:
        return False

    user = user or current_user.email

    for p in PERMS:
        pg = PERMS[p]
        if pg.check(role, table, user):
            return True

if config.AUTHORIZED_USERS:
    PERMS = read_rbac_file(config.AUTHORIZED_USERS)

if __name__ == "__main__":
    check("admin", "snorkel", "okay")
    check("query", "snorkel", "okay")
    check("admin", "demo", "test")
    check("query", "demo", "test")
