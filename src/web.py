import pudgy
import flask
import os

app = flask.Flask(__name__)

pudgy.register_blueprint(app)
pudgy.use_jquery()

from .pages import HomePage, QueryPage

@app.route('/')
def get_index():
    return HomePage(template="home.html").render()


@app.route('/query')
def get_view():
    query = flask.request.args

    table = query.get('table')
    view = query.get('view', 'table')

    return QueryPage(template="query.html", table=table, view=view).pipeline()


app.after_request(pudgy.compress_request)

if __name__ == "__main__":
    app.run(port=2333)

