from .components import OldSnorkelComponent

class filter_row(OldSnorkelComponent):
    pass

class tabs(OldSnorkelComponent):
    pass

class modal(OldSnorkelComponent):
    # for our modal, we want it to close, so
    # we don't force "display: inherit !important"
    @classmethod
    def add_display_rules(cls, data):
        return data

class timeago(OldSnorkelComponent):
    pass

class tablesorter(OldSnorkelComponent):
    pass

class table_popover(OldSnorkelComponent):
    pass

class query_details(OldSnorkelComponent):
    pass

class query_tile(OldSnorkelComponent):
    pass
