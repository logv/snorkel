from __future__ import absolute_import
import pudgy
from .components import *
from .query_sidebar import QuerySidebar
from .user_button import UserButton, UserModal

# old snorkel components are prefixed with sf
from . import sf_components as sf

class TourCarousel(pudgy.BackboneComponent, pudgy.JinjaComponent):
    def __prepare__(self):
        from . import tour
        self.context.slides = tour.slides

def install(app):
    pudgy.use_jquery()
    pudgy.add_to_prelude("bootstrap", os.path.join(app.static_folder, "vendor/bootstrap.min.js"))
    pudgy.add_prelude_line("require('bootstrap')");
    app.after_request(pudgy.compress_request)
