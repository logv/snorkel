from flask import Flask, render_template, redirect, url_for
from werkzeug import Response
from flask_peewee.db import Database
from peewee import *
from flask_security import Security, PeeweeUserDatastore
from flask_security import login_required, login_user, logout_user

from flask_security.core import current_user
from flask_dance.contrib.google import make_google_blueprint, google


from .models import User, Role, UserRoles, userdb
from . import oauth, config

import random, sys, os

import flask
def install(app):
    oauth.install(app)

    # TODO: these get configured via config file
    app.config['SECRET_KEY'] = config.SECRET_KEY
    app.config['SECURITY_PASSWORD_SALT'] = config.SECURITY_PASSWORD_SALT
    app.config['SECURITY_CHANGEABLE'] = True


    db = userdb

    # Setup Flask-Security
    user_datastore = PeeweeUserDatastore(db, User, Role, UserRoles)
    security = Security(app, user_datastore)

    # Create a user to test with
    @app.before_first_request
    def create_user():
        if "RESET" in os.environ:
            for Model in (Role, User, UserRoles):
                Model.drop_table(fail_silently=True)
                Model.create_table(fail_silently=True)
            user_datastore.create_role(name='superuser')

    # Views
    @app.route('/')
    @needs_login
    def home():
        return render_template('index.html')


def needs_login(func):
    def wrapped_func(*args, **kwargs):

        auth = False
        if current_user.is_authenticated:
            auth = True
        else:
            if google.authorized:
                err = False
                try:
                    resp_json = google.get("/oauth2/v2/userinfo").json()
                    print "RESP JSON", resp_json
                    if "error" in resp_json:
                        err = True
                except Exception, e:
                    err = True

                if err:
                    oauth.logout_oauth()

        if not auth:
            return redirect(url_for("security.login"))

        return func(*args, **kwargs)

    wrapped_func.__name__ = func.__name__
    return wrapped_func

# if our login_required returns a Response with code 300, we know to reload the
# page
def rpc_login_required(func):
    f = needs_login(func)
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
