import pudgy
import dotmap

import os

@pudgy.Virtual
class OldSnorkelComponent(pudgy.SuperfluousComponent):
    BASE_DIR = os.path.join(pudgy.Component.BASE_DIR, "sf")

class UIComponent(pudgy.Component):
    BASE_DIR = os.path.join(pudgy.Component.BASE_DIR, "ui")

class Button(UIComponent, pudgy.MustacheComponent):
    pass

class TextInput(UIComponent, pudgy.MustacheComponent):
    pass

class Selector(UIComponent, pudgy.MustacheComponent, pudgy.SassComponent):
    def __init__(self, *args, **kwargs):
        super(Selector, self).__init__(*args, **kwargs)

        self.context.name = kwargs.get('name')
        self.context.options = []

        options = kwargs.get('options')


        for option in options:
            name = option
            value = option
            if len(option) == 2 and type(option) != str:
                name, value = option

            self.context.options.append({
                "name" : name,
                "value" : value,
                "selected": "selected" if value == kwargs.get('selected') else ""
            })


class LineGraph(UIComponent, pudgy.JSComponent):
    NAMESPACE="grapher"
    pass

# TODO: add selected
class MultiSelect(UIComponent, pudgy.JinjaComponent, pudgy.BackboneComponent):
    pass

class ControlRow(UIComponent, pudgy.MustacheComponent):
    def __init__(self, name, label, control):
        super(ControlRow, self).__init__(name, label, control)
        self.context.name = name
        self.context.label = label
        self.context.control = control.__html__
