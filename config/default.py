# google auth settings
USE_GOOGLE_AUTH = False
GOOGLE_CLIENT_ID=None
GOOGLE_CLIENT_SECRET=None
AUTHORIZED_DOMAIN=None # anyone can login from any domain

# Role Based Authentication
# this lets you choose which users see which tables
# look at default.rbac for how to set this file up
AUTHORIZED_USERS=None

# flask security settings
SECRET_KEY='changme'
SECURITY_PASSWORD_SALT= b"changemeharder"

# show the default welcome page
SHOW_TOUR=False
