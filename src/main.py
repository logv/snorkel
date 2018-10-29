# This is an example of how we would configure snorkel
# from the outside
# if we are outside snorkel package, it would be:

# from snorkel import web
# from snorkel.presenter import DatasetPresenter, RegisterPresenter


from . import web
from .presenter import DatasetPresenter, RegisterPresenter

from plugins.snorkel_basic_views import TableView, TimeView, DistView, SamplesView
from plugins.snorkel_advanced_views import TimelineView, OverviewView

def configure_presenters():
    default_presenter = DatasetPresenter()
    default_presenter.set_views([
        TableView,
        TimeView,
        DistView,
        SamplesView
    ])
    RegisterPresenter(".*", default_presenter)

    nginx_presenter = DatasetPresenter()
    nginx_presenter.set_views([
        TableView,
        TimeView,
        DistView,
        SamplesView,
        TimelineView,
        OverviewView
    ])
    RegisterPresenter(".*", nginx_presenter)


if __name__ == "__main__":
    configure_presenters()
    web.app.run(port=2333, use_reloader=False)
