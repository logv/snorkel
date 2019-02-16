from __future__ import print_function
from flask import session, abort, redirect
from flask_dance.consumer import oauth_authorized
from flask_dance.contrib.google import make_google_blueprint, google
from flask_security import login_user, logout_user
from .models import User, userdb
from . import config
import random
import requests
import sys


from .config import USE_GOOGLE_AUTH, AUTHORIZED_DOMAIN
def setup_google_blueprint(app):
    global USE_GOOGLE_AUTH

    if not USE_GOOGLE_AUTH:
        return

    google_bp = make_google_blueprint(
        client_id=config.GOOGLE_CLIENT_ID,
        client_secret=config.GOOGLE_SECRET,
        scope=["email"]
    )
    app.register_blueprint(google_bp)


    @oauth_authorized.connect_via(google_bp)
    def logged_in(blueprint, token):
        resp_json = google.get("/oauth2/v2/userinfo").json()
        email = resp_json["email"]
        hd = email.split("@")[-1]
        print("HD IS", hd)
        if AUTHORIZED_DOMAIN and hd != AUTHORIZED_DOMAIN:
            requests.post(
                "https://accounts.google.com/o/oauth2/revoke",
                params={"token": token["access_token"]}
            )
            session.clear()
            abort(403)

        pw = "%x" % int(random.random() * sys.maxsize)
        user, found = User.get_or_create(email=email,defaults={"password" : pw})
        user.save()

        login_user(user)

def logout_oauth():
    logout_user()
    try:
        if google.authorized:
            try:
                token = google.token["access_token"]
                resp = google.post(
                    "https://accounts.google.com/o/oauth2/revoke",
                    params={"token": token},
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                print(resp.ok, resp.text)
            except Exception as e:
                print(e)
    except:
        pass

def install(app):
    app.jinja_env.globals.update(google_auth=USE_GOOGLE_AUTH)
    setup_google_blueprint(app)

    @app.route("/logout")
    def logout():
        logout_oauth()
        return redirect('/')
