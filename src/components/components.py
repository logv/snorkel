import pudgy

import os

@pudgy.Virtual
class OldSnorkelComponent(pudgy.SuperfluousComponent):
    NAMESPACE = "sf"

class UIComponent(pudgy.Component):
    NAMESPACE = "ui"

class Button(UIComponent, pudgy.MustacheComponent):
    pass

class TextInput(UIComponent, pudgy.MustacheComponent):
    pass

class Table(UIComponent, pudgy.MustacheComponent, pudgy.SassComponent):
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

            selected = str(kwargs.get('selected', ''))
            value = str(value)


            self.context.options.append({
                "name" : name,
                "value" : value,
                "selected": "selected" if value == selected else ""
            })


class MultiSelect(UIComponent, pudgy.JinjaComponent, pudgy.BackboneComponent):
    pass

class ControlRow(UIComponent, pudgy.MustacheComponent):
    def __init__(self, name, label, control, hidden=False):
        super(ControlRow, self).__init__(name, label, control)
        self.context.name = name
        self.context.label = label
        self.context.hidden = "hidden" if hidden else ""
        self.context.control = control.__html__
