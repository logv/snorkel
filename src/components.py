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
            if len(option) == 2:
                name, value = option

            self.context.options.append({
                "name" : name,
                "value" : value,
                "selected": "selected" if value == kwargs.get('selected') else ""
            })

class MultiSelect(pudgy.JinjaComponent, pudgy.BackboneComponent):
    pass



class QuerySidebar(pudgy.BackboneComponent, pudgy.JinjaComponent, pudgy.SassComponent, pudgy.ServerBridge):
    def __prepare__(self):
        self.context.controls = self.context.view.get_controls()

@QuerySidebar.api
def run_query(cls, *query_params):
    # this is a name/value encoded array, unfortunately
    print "RUNNING QUERY", query_params

class ControlRow(pudgy.MustacheComponent):
    def __init__(self, name, label, control):
        super(ControlRow, self).__init__(name, label, control)
        self.context.name = name
        self.context.label = label
        self.context.control = control.__html__

