# This is an example of how we would configure snorkel
# from the outside
# if we are outside snorkel package, it would be:

# from snorkel import web
# from snorkel.presenter import DatasetPresenter, RegisterPresenter


import os
from . import web
from .presenter import DatasetPresenter, RegisterPresenter, ConfigureTable

from .views import ViewSeparator

from .plugins.snorkel_basic_views import TableView, TimeView, DistView, SamplesView
from .plugins.snorkel_basic_views import AreaView, ScatterView, BarView, GroupedDist
from .plugins.snorkel_advanced_views import TimelineView, OverviewView, ForecastView, DrilldownView
from .plugins.snorkel_advanced_views import DigraphView, WecoView

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


def main():
    configure_presenters()

    PROFILE="PROFILE" in os.environ
    if PROFILE:
        from werkzeug.contrib.profiler import ProfilerMiddleware
        web.app.config['PROFILE'] = True
        web.app.wsgi_app = ProfilerMiddleware(web.app.wsgi_app, restrictions = [30])

    web.app.run(port=os.environ.get("PORT", 2333), use_reloader=False, debug=PROFILE)

if __name__ == "__main__":
    main()
