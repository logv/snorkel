import pudgy
import dotmap

class Selector(pudgy.MustacheComponent):
    def __init__(self, *args, **kwargs):
        super(Selector, self).__init__(*args, **kwargs)

        self.context.name = kwargs.get('name')
        self.context.options = []

        options = kwargs.get('options')
        print "OPTIONS", options
        for option in options:
            self.context.options.append({
                "name" : option,
                "value" : options[option],
                "selected": "selected" if options[option] == kwargs.get('selected') else ""
            })

class MultiSelect(pudgy.JinjaComponent, pudgy.BackboneComponent):
    pass

class ControlRow(pudgy.MustacheComponent):
    def __init__(self, name, label, control):
        super(ControlRow, self).__init__(name, label, control)
        self.context.name = name
        self.context.label = label
        self.context.control = control.__html__

# a virtual component has no assets
@pudgy.Virtual
class ViewBase(pudgy.BackboneComponent):
    def get_controls(self):
        info = dotmap.DotMap(self.context.info)

        controls = []

        view_selector = Selector(
            name="view",
            options={
                "table" : "table",
                "time" : "time",
                "dist" : "dist",
                "samples" : "samples",
            },
            selected="table")

        controls.append(ControlRow("view", "View", view_selector))


        groups = dict(map(lambda w: (w,w), info["columns"]["strs"]))
        groupby = MultiSelect(
            name="groupby[]",
            options=groups,
            selected=[])

        print("GROUPBY", groupby)
        controls.append(ControlRow("groupby[]", "Group By", groupby))

        return controls

class TableView(ViewBase, pudgy.JSComponent):
    NAME="table"
    BASE="table"

class TimeView(ViewBase, pudgy.JSComponent):
    NAME="time"
    BASE="time"

class DistView(ViewBase, pudgy.JSComponent):
    NAME="dist"
    BASE="dist"

class SamplesView(ViewBase, pudgy.JSComponent):
    NAME="samples"
    BASE="samples"

class QuerySidebar(pudgy.BackboneComponent, pudgy.JinjaComponent):
    def __prepare__(self):
        self.context.controls = self.context.view.get_controls()
