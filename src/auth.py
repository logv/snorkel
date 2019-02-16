from flask import Flask, render_template, redirect, url_for
from werkzeug import Response
from flask_peewee.db import Database
from peewee import *
from flask_security import Security, PeeweeUserDatastore
from flask_security import login_required, login_user, logout_user

from flask_security.core import current_user, _security
from flask_dance.contrib.google import make_google_blueprint, google


from .models import User, Role, UserRoles, UserToken, userdb
from . import oauth, config, rbac

import random, sys, os

# Uses our own authentication tokens instead of the signed ones from
# flask_security because the verification of signatures takes too long
def _request_loader(request):
    header_key = _security.token_authentication_header
    args_key = _security.token_authentication_key
    header_token = request.headers.get(header_key, None)
    token = request.args.get(args_key, header_token)
    if request.is_json:
        data = request.get_json(silent=True) or {}
        if isinstance(data, dict):
            token = data.get(args_key, token)

    try:
        token = UserToken.select().where(UserToken.token == token).first()
        user = token.user
        login_user(user)
        return user
    except Exception as e:
        pass
    return _security.login_manager.anonymous_user()

import flask
def install(app):
    oauth.install(app)

    app.config['SECRET_KEY'] = config.SECRET_KEY
    app.config['SECURITY_PASSWORD_SALT'] = config.SECURITY_PASSWORD_SALT
    app.config['SECURITY_CHANGEABLE'] = True

    db = userdb

    # Setup Flask-Security
    user_datastore = PeeweeUserDatastore(db, User, Role, UserRoles)
    security = Security(app, user_datastore)
    app.login_manager.request_loader(_request_loader)


    # Views
    @app.route('/')
    @needs_login
    def home():
        return render_template('index.html')


def check_auth():
    auth = False
    if current_user.is_authenticated:
        auth = True
    else:
        if google.authorized:
            err = False
            try:
                resp_json = google.get("/oauth2/v2/userinfo").json()
                if "error" in resp_json:
                    err = True
            except Exception as e:
                err = True

            if err:
                oauth.logout_oauth()

    return auth

def needs_login(func):
    def wrapped_func(*args, **kwargs):

        try:
            auth = check_auth()
        except Exception as e:
            auth = False

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
