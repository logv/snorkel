import pudgy
import flask
import os

from .pages import QueryPage, DatasetsPage, HomePage
from . import auth, components, results
from flask_security import login_required, core

app = flask.Flask(__name__)
pudgy.register_blueprint(app)

app.config.update({
    "SESSION_COOKIE_NAME" : "slite"
})


@app.route('/')
def get_index():
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
    table = query.get('table')
    view = query.get('view', 'table')
    sq = None
    if query_id:
        sq = results.get_by_hashid(query_id)
        if sq:
            sq = sq.pop()
            table = sq["table"]
            view = sq["parsed"]["view"]

    print "SAVED QUERY", type(sq)

    return QueryPage(template="query.html", table=table, view=view, saved=sq).pipeline()

auth.install(app)
components.install(app)

if __name__ == "__main__":
    app.run(port=2333, use_reloader=False)
