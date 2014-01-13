module.exports = function(options) {
	return function(req, res, next) {
		if (options.reg.test(req.url)) {
			var loc = req.url.replace(options.reg, options.str);
			console.log(options.str+'-redirect: ', req.url, loc);
			res.writeHead(301, {'Location': loc});
			res.end();
		} else { next(); }
	};
};
