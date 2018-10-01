import flask

# from http://flask.pocoo.org/docs/0.12/patterns/apierrors/
class ServerError(Exception):
    status_code = 400

    def __init__(self, message, status_code=None, payload=None):
        Exception.__init__(self)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or ())
        rv['message'] = self.message
        return rv

def install(app):
    print "INSTALLING APP HANDLER", app
    @app.errorhandler(ServerError)
    def handle_invalid_usage(error):
        print "HANDLING SERVER ERROR", error
        response = flask.jsonify(error.to_dict())
        response.status_code = error.status_code
        return response


