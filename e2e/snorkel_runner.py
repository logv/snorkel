from __future__ import print_function

import os
import sys
from flask_security.utils import encrypt_password, verify_password

SNORKEL_DIR=os.path.expanduser("~/.local/share/snorkel")
def shared_mode():
    print("SWITCHING TO SHARED DIR", SNORKEL_DIR, file=sys.stderr)
    try:
        os.makedirs(SNORKEL_DIR)
    except:
        pass
    os.chdir(SNORKEL_DIR)
shared_mode()

from snorkel.presenter import DatasetPresenter, RegisterPresenter

from snorkel.views import ViewSeparator

from snorkel.plugins.snorkel_basic_views import TableView, TimeView, DistView, SamplesView
from snorkel.plugins.snorkel_basic_views import AreaView, ScatterView, BarView, GroupedDist
from snorkel.plugins.snorkel_advanced_views import TimelineView, OverviewView, ForecastView, DrilldownView
from snorkel.plugins.snorkel_advanced_views import DigraphView, WecoView

def configure_presenters():
    default_presenter = DatasetPresenter()
    default_presenter.set_views([
        TableView,
        TimeView,
        DistView,
        SamplesView,
        TimelineView,
        OverviewView,
        ViewSeparator,
        AreaView,
        BarView,
        ScatterView,
        GroupedDist,
        ViewSeparator,
        DigraphView,
        ViewSeparator,
        WecoView,
        ForecastView,
        DrilldownView

    ])
    RegisterPresenter(".*", default_presenter)


configure_presenters()
if __name__ == "__main__":
    print("STARTING SNORKEL FRONTEND")
    from snorkel import web
    from snorkel import models


    try:
        models.create_db_if_not()
    except Exception as e:
        print("COULDNT CREATE MODELS", e)

    print(os.getcwd())
    print(os.listdir("sdb"))

    with web.app.app_context():
        user = models.User.create(email="test", password=encrypt_password("me"))
    web.app.run(
        host=os.environ.get('HOST', '0.0.0.0'),
        port=os.environ.get('PORT', 2333),
        use_reloader=False)

# vim syntax=python
