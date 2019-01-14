import flask_security
from .components import UIComponent
import pudgy

class UserButton(UIComponent, pudgy.MustacheComponent):
    def __prepare__(self):
        self.context.user = flask_security.core.current_user

class UserModal(UIComponent, pudgy.JinjaComponent,
        pudgy.ServerBridge, pudgy.SassComponent):
    def __prepare__(self):
        self.context.user = flask_security.core.current_user

