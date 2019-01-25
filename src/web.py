import pudgy
import flask
import os
import json

from .pages import QueryPage, DatasetsPage, HomePage, UserPage
from . import auth, components, results, admin, config
from flask_security import core, current_user
from flask import redirect, url_for
from .auth import needs_login

from .backend.sybil import SybilBackend


app = flask.Flask(__name__)
pudgy.register_blueprint(app)

app.config.update({
    "SESSION_COOKIE_NAME" : "slite"
})


@app.route('/')
def get_index():
    if current_user.is_authenticated:
        return redirect(url_for('get_datasets'))
    return HomePage(template="home.html").render()

@app.route('/user')
@needs_login
def get_user_settings():
    return UserPage(template='user_settings.html', auth_token=current_user.get_auth_token()).render()

@app.route('/datasets')
@needs_login
def get_datasets():
    return DatasetsPage(template="datasets.html").render()

@app.route('/query')
@needs_login
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

    return QueryPage(template="query.html", table=table, view=view, saved=sq).pipeline()


def return_json(d):
    return json.dumps(d), 200, {"ContentType" : "application/json"}

# this route expects JSON data
# table = the table to import into
# samples = the samples to import
@app.route('/data/ingest', methods=['POST'])
@needs_login
def post_data():
    bs = SybilBackend()
    table = flask.request.json.get("table", None)
    if not table:
        return return_json({'error' : "No table specified"})

    samples = flask.request.json.get("samples", None)
    if not samples:
        return return_json({'error' : "No samples specified"})
    bs.ingest(table, samples)

    return return_json({'success':True, "num_samples" : len(samples)})


admin.install(app)
auth.install(app)
components.install(app)

if __name__ == "__main__":
    app.run(port=2333, use_reloader=False)
