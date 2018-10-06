from peewee import *
from playhouse.sqlite_ext import *

from flask_security import RoleMixin, UserMixin
import os

from playhouse.sqliteq import SqliteQueueDatabase

DB_DIR="sdb"
userdb = SqliteDatabase(os.path.join(DB_DIR, 'users.db'))
querydb = SqliteDatabase(os.path.join(DB_DIR, 'queries.db'))

class QueryModel(Model):
    class Meta:
        database = querydb

class UserModel(Model):
    class Meta:
        database = userdb

class SavedQuery(QueryModel):
    user = IntegerField(index=True)
    table = CharField(index=True)

    hashid = CharField(index=True)
    created = TimestampField(index=True, utc=True)
    updated = TimestampField(utc=True)

    results = JSONField()
    parsed = JSONField()

    class Meta:
        database = querydb

class Role(UserModel, RoleMixin):
    name = CharField(unique=True)
    description = TextField(null=True)

class User(UserModel, UserMixin):
    email = TextField()
    password = TextField()
    active = BooleanField(default=True)
    confirmed_at = DateTimeField(null=True)

class UserRoles(UserModel):
    # Because peewee does not come with built-in many-to-many
    # relationships, we need this intermediary class to link
    # user to roles.
    user = ForeignKeyField(User, related_name='roles')
    role = ForeignKeyField(Role, related_name='users')
    name = property(lambda self: self.role.name)
    description = property(lambda self: self.role.description)

if __name__ == "__main__":
    try:
        os.makedirs(DB_DIR)
    except Exception, e:
        pass

    for c in [SavedQuery, User]:
        c._meta.database.connect()
        if "RESET" in os.environ:
            c._meta.database.create_tables([c])
