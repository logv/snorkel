# This is an example of how we would configure snorkel
# from the outside
# if we are outside snorkel package, it would be:

# from snorkel import web
# from snorkel.presenter import DatasetPresenter, RegisterPresenter


import os
from . import web
from .presenter import DatasetPresenter, RegisterPresenter

from .views import ViewSeparator

from plugins.snorkel_basic_views import TableView, TimeView, DistView, SamplesView
from plugins.snorkel_basic_views import AreaView, ScatterView, BarView, GroupedDist

from plugins.snorkel_advanced_views import TimelineView, OverviewView, ForecastView, DrilldownView, WecoView

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
        WecoView,
        ForecastView,
        DrilldownView

    ])
    RegisterPresenter(".*", default_presenter)


if __name__ == "__main__":
    configure_presenters()
    web.app.run(port=os.environ.get("PORT", 2333), use_reloader=False)
