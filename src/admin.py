from flask import redirect, url_for, request

from flask_admin import Admin
from flask_admin.contrib.peewee import ModelView

from flask_security.core import current_user

from . import models
# set optional bootswatch theme
class AdminModelView(ModelView):

    def is_accessible(self):
        if not current_user.is_active or not current_user.is_authenticated:
            return False

        if current_user.has_role('superuser'):
            return True

        return False

    def _handle_view(self, name, **kwargs):
        """
        Override builtin _handle_view in order to redirect users when a view is not accessible.
        """

        if not self.is_accessible():
            if current_user.is_authenticated:
                # permission denied
                abort(403)
            else:
                # login
                return redirect(url_for('security.login', next=request.url))

def install(app):
    app.config['FLASK_ADMIN_SWATCH'] = 'flatly'
    app.config['FLASK_ADMIN_FLUID_LAYOUT'] = True
 
    admin = Admin(app, name='snorkelite', template_mode='bootstrap3')
    admin.add_view(AdminModelView(models.User, name='Users'))
    admin.add_view(AdminModelView(models.UserRoles, name='UserRoles'))
    admin.add_view(AdminModelView(models.Role, name='Roles'))


