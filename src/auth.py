from flask import Flask, render_template
from flask_peewee.db import Database
from peewee import *
from flask_security import Security, PeeweeUserDatastore
from flask_security import login_required

from .models import User, Role, UserRoles, userdb

def install(app):
    app.config['SECRET_KEY'] = 'vsaitheencretkeoisabtalle'
    app.config['SECURITY_PASSWORD_SALT'] = b"3xdoiwqkvcsusy9i145ujhypoi1nj2ez8vyu"

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

    # Views
    @app.route('/')
    @login_required
    def home():
        return render_template('index.html')

if __name__ == '__main__':
    app = Flask(__name__)
    install(app)
    app.run()
