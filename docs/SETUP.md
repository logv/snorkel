## guide to setting up slite

slite has a snorkel clone written in python. This doc describes how to
configure slite.

## User Management

### Admin Page

Visit `/admin/` with a superuser to go to the flask admin page. From here, new
users can be added and configured.

### Google Auth

Edit config/local.py and add the relevant GOOGLE_AUTH_* settings from
config/default.py. If you only want users from a specific email domain to
connect, that can be configured via the AUTHORIZED_DOMAIN variable.

To get slite working, you need to add https://<slitehost>/google/authorized	in
the google API console: https://console.developers.google.com/apis/credentials.

To find your google app ID and secret, they are also located in
https://console.developers.google.com/apis/credentials

### Adding new users

New users can be added from the admin interface or by modifying the
`sdb/users.db` with sqlite.

You can also use `scripts/add_user.py` and `scripts/add_superuser.py` for CLI
administration.

## Adding data

### From Sybil

All sybil data for slite should be kept in ROOT/db/. You can use sybil to
ingest data anywhere on the system, then link the table into $ROOT/db/

For example: if we ingest data into sybil with `sybil ingest -table foobar -dir
~/sdb/`, then we would run: `ln -s ~/sdb/foobar $ROOT/db/foobar` to add that
table into slite.

You can also just do: `sybil ingest -table foobar -dir ${ROOT}/db/` directly and skip
the symbolic link step.

### From slite

Currently, slite is not setup to accept data over any endpoints - all data must
be ingested through the sybil CLI.
