from flask import Flask, render_template
from werkzeug import Response
from flask_peewee.db import Database
from peewee import *
from flask_security import Security, PeeweeUserDatastore
from flask_security import login_required

from .models import User, Role, UserRoles, userdb

import flask
def install(app):
    # TODO: these get configured via config file
    app.config['SECRET_KEY'] = 'vsaitheencretkeoisabtalle'
    app.config['SECURITY_PASSWORD_SALT'] = b"3xdoiwqkvcsusy9i145ujhypoi1nj2ez8vyu"
    app.config['SECURITY_CHANGEABLE'] = True


    db = userdb

    # Setup Flask-Security
    user_datastore = PeeweeUserDatastore(db, User, Role, UserRoles)
    security = Security(app, user_datastore)

    # Create a user to test with
    @app.before_first_request
    def create_user():
        for Model in (Role, User, UserRoles):
            Model.drop_table(fail_silently=True)
            Model.create_table(fail_silently=True)
        user_datastore.create_user(email='okay', password='test')
        user_datastore.create_role(name='superuser')
        user_datastore.create_user(username='admin', email='admin',
                                   password='nottheadmin', roles=['superuser'])

    # Views
    @app.route('/')
    @login_required
    def home():
        return render_template('index.html')

# if our login_required returns a Response with code 300, we know to reload the
# page
def rpc_login_required(func):
    f = login_required(func)
    def wrapped_func(*args, **kwargs):

        r = f(*args, **kwargs)
        if isinstance(r, Response):
            # if we have a redirect, we need to translate it to the grpc framework
            if r.status_code in [301, 302, 303, 305, 307]:
                flask.request.pudgy.activations.append("window.location.reload()")

                # get and unset all the flashed messages
                # TODO: this is a temporary workaround for duplicate messages
                flashed = set(flask.get_flashed_messages(with_categories=True))
                return { "_status" : r.status, "_nextUrl" : r.location }

        return r

    wrapped_func.__name__ = func.__name__

    return wrapped_func

if __name__ == '__main__':
    app = Flask(__name__)
    install(app)
    app.run()
