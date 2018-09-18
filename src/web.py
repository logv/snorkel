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


@app.route('/query/<table>/<view>')
def get_view(table, view):
    return QueryPage(template="query.html", table=table, view=view).render()


if __name__ == "__main__":
    app.run(port=2333)

