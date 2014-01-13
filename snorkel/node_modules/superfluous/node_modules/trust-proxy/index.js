module.exports = function trustProxy(req, res, next) {
  req.connection.remoteAddress = extract(req['X-Forwarded-For']) || req.connection.remoteAddress
  req.proto = extract(req['X-Forwarded-Proto']) || 'http'
  req.secure = req.proto === 'https'
  next()
}

function extract(value) { return last(value.split(',')).trim().toLowerCase() }
function last(arr) { return arr[arr.length - 1] }
