from __future__ import print_function
from peewee import *
from playhouse.sqlite_ext import *

from flask_security import RoleMixin, UserMixin

import os
import zlib

from playhouse.sqliteq import SqliteQueueDatabase
from playhouse.migrate import SqliteMigrator, migrate

DB_DIR="sdb"
userdb = SqliteDatabase(os.path.join(DB_DIR, 'users.db'))
querydb = SqliteDatabase(os.path.join(DB_DIR, 'queries.db'))

to_bytes = str
try:
    bytes("abc", "UTF-8")
    buffer = memoryview
    to_bytes = lambda s: bytes(s, "UTF-8")
except:
    pass

class QueryModel(Model):
    class Meta:
        database = querydb

class UserModel(Model):
    class Meta:
        database = userdb

class ZipJSONField(JSONField):
    def db_value(self, value):
        """Convert the python value for storage in the database."""
        if value is not None:
            bts = to_bytes(json.dumps(value))
            value = buffer(zlib.compress(bts))

        return value

    def python_value(self, value):
        """Convert the database value to a pythonic value."""
        try:
            value = zlib.decompress(value)
        except:
            pass

        return value if value is None else json.loads(value)


class SavedQuery(QueryModel):
    user = IntegerField(index=True)
    table = CharField(index=True)

    hashid = CharField(index=True)
    created = TimestampField(index=True, utc=True)
    updated = TimestampField(utc=True)
    zipped = BooleanField(default=False)

    results = ZipJSONField()
    compare = ZipJSONField()
    parsed = ZipJSONField()

    def toObject(self):
        return {
            "results" : self.results,
            "parsed" : self.parsed,
            "created" : self.created

        }

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

    def get_auth_token(self):
        tokens = list(self.get_tokens())
        if not tokens:
            UserToken.create_for_user(self)

        return self.tokens[0].token

    def get_tokens(self):
        return self.tokens

class UserToken(UserModel):
    user = ForeignKeyField(User, related_name='tokens')
    token = TextField(unique=True)
    active = BooleanField(default=True)

    @classmethod
    def create_for_user(cls, user):
        import uuid
        randid = uuid.uuid4()
        token = UserToken.create(token=randid, user=user)
        return token



class UserRoles(UserModel):
    # Because peewee does not come with built-in many-to-many
    # relationships, we need this intermediary class to link
    # user to roles.
    user = ForeignKeyField(User, related_name='roles')
    role = ForeignKeyField(Role, related_name='users')
    name = property(lambda self: self.role.name)
    description = property(lambda self: self.role.description)

def create_db_if_not():
    print(' * Verifying database models')
    try:
        os.makedirs(DB_DIR)
    except Exception as e:
        pass

    User._meta.database.connect()
    for c in [SavedQuery, User, UserToken, UserRoles]:
        c._meta.database.create_tables([c])

    # query DB migrations
    migrator = SqliteMigrator(querydb)
    MIGRATIONS = []

    columns = [ c.name for c in SavedQuery._meta.database.get_columns('savedquery') ]
    if not 'zipped' in columns:
        m = migrator.add_column('savedquery', 'zipped', BooleanField(default=False))
        MIGRATIONS.append(m)

    if not 'compare' in columns:
        m = migrator.add_column('savedquery', 'compare', JSONField(default=''))
        MIGRATIONS.append(m)

    for migration in MIGRATIONS:
        try:
            migrate(migration)
        except Exception as e:
            print(e)

create_db_if_not()
