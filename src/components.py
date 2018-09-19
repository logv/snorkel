import pudgy
import dotmap

class Button(pudgy.MustacheComponent):
    pass

class TextInput(pudgy.MustacheComponent):
    pass

class Selector(pudgy.MustacheComponent):
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


# TODO: add selected
class MultiSelect(pudgy.JinjaComponent, pudgy.BackboneComponent):
    pass

class ControlRow(pudgy.MustacheComponent):
    def __init__(self, name, label, control):
        super(ControlRow, self).__init__(name, label, control)
        self.context.name = name
        self.context.label = label
        self.context.control = control.__html__
