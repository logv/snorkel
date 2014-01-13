# trust-proxy

  Middleware to trust the closest proxy for IP and protocol data.
  For if you're behind a reverse proxy or load balancer (such as on [Nodejitsu](http://nodejitsu.com))
  Fixes `req.connection.remoteAddress`, adds `req.proto` and `req.secure`.
  Inspired by the `trust proxy` option of Express.
