import pudgy
import flask
import os
import time

import addict

from flask import redirect, url_for
from flask_security import core, current_user

from . import auth, components, results, admin, config, grafana
from . import fastjson as json

from .pages import QueryPage, DatasetsPage, HomePage, UserPage
from .auth import needs_login
from .backend.sybil import SybilBackend
from .util import return_json




app = flask.Flask(__name__)

from werkzeug.contrib.fixers import ProxyFix
app.wsgi_app = ProxyFix(app.wsgi_app)


pudgy.register_blueprint(app)

app.config.update({
    "SESSION_COOKIE_NAME" : "slite"
})

@app.before_request
def start_logger():
    flask.request._sample = addict.Dict()
    flask.request._sample.time = time.time()

@app.after_request
def send_logs(req):
    if not flask.request._sample:
        return

    url = flask.request.url
    route = 'unknown'
    if flask.request.url_rule:
        route = flask.request.url_rule.rule
    duration = time.time() - flask.request._sample.time
    flask.request._sample.duration = duration
    flask.request._sample.route = route
    flask.request._sample.url = url
    ua = flask.request.user_agent

    flask.request._sample.user_agent = {
        "browser" : ua.browser,
        "platform" : ua.platform,
        "version" : ua.version,
        "language" : ua.language,
        "ip" : flask.request.remote_addr
    }

    bs = SybilBackend()
    try:
        bs.ingest("slite@pagestats", [flask.request._sample])
    except:
        pass

    return req


@app.route('/')
def get_index():
    if current_user.is_authenticated:
        return redirect(url_for('get_datasets'))

    if not config.SHOW_TOUR:
        return redirect(url_for('get_datasets'))

    return HomePage(template="welcome.html").render()

@app.route('/tour')
def get_tour():
    carousel = components.TourCarousel()
    return HomePage(template="tour.html", carousel=carousel).render()

@app.route('/pkg/status')
def get_status():
    return "OK", 200

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

@app.route('/query/grafana')
def get_grafana():
    query = flask.request.args
    return grafana.run_query(query)

# this route expects JSON data
# table = the table to import into
# samples = the samples to import
@app.route('/data/import', methods=['POST'])
@needs_login
def post_data():
    bs = SybilBackend()

    # data can either be sent as form data or as JSON data
    # so we first try reading the JSON
    args = flask.request.json
    if not args:
        args = flask.request.form

    table = args.get("table", None)

    if not table:
        dataset = args.get("dataset")
        subset = args.get("subset")
        if dataset and subset:
            table = '%s@%s' % (dataset, subset)

    if not table:
        return return_json({'error' : "No table specified"})

    samples = args.get("samples", None)
    if isinstance(samples, (str, unicode)):
        try:
            samples = json.loads(samples)
        except:
            samples = None

    if not samples:
        return return_json({'error' : "No samples specified"})

    bs.ingest(table, samples)

    return return_json({'success':True, "num_samples" : len(samples)})


admin.install(app)
auth.install(app)
components.install(app)

if __name__ == "__main__":
    app.run(port=2333, use_reloader=False)
