import pudgy
import flask
import os

from .pages import QueryPage, DatasetsPage, HomePage

from . import auth, users


from flask_security import login_required, core

app = flask.Flask(__name__)
pudgy.register_blueprint(app)


@app.route('/')
def get_index():
    print type(core.current_user)
    return HomePage(template="home.html").render()


@app.route('/datasets')
@login_required
def get_datasets():
    return DatasetsPage(template="datasets.html").render()

@app.route('/query')
@login_required
def get_view():
    query = flask.request.args

    query_id = query.get("h")
    if query_id:
        # TODO load saved query and display it too
        pass
    else:
        table = query.get('table')
        view = query.get('view', 'table')

        return QueryPage(template="query.html", table=table, view=view).pipeline()

auth.install(app)
pudgy.use_jquery()
pudgy.add_to_prelude("bootstrap", os.path.join(app.static_folder, "bootstrap.min.js"))
pudgy.add_prelude_line("require('bootstrap')");
app.after_request(pudgy.compress_request)

if __name__ == "__main__":
    app.run(port=2333)

