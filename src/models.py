from __future__ import print_function
from peewee import *
from playhouse.sqlite_ext import *

from flask_security import RoleMixin, UserMixin

import os

from playhouse.sqliteq import SqliteQueueDatabase
from playhouse.migrate import SqliteMigrator, migrate

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
    compare = JSONField()
    parsed = JSONField()

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
    try:
        os.makedirs(DB_DIR)
    except Exception as e:
        pass

    User._meta.database.connect()
    for c in [SavedQuery, User, UserToken, UserRoles]:
        c._meta.database.create_tables([c])

    # query DB migrations
    # not necessarily needed
    migrator = SqliteMigrator(querydb)
    try:
        migrate(
            migrator.add_column('savedquery', 'compare', JSONField(default='')),
        )
    except Exception as e:
        print(e)

if __name__ == "__main__":
    if "RESET" in os.environ:
        create_db_if_not()
