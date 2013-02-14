#!/usr/bin/env node

var args = (function() {
	var args = {};
	process.argv.slice(2).forEach(function(arg) {
		if (arg.indexOf('--') === 0) {
			arg = arg.replace(/^--/, '');
			if (arg.indexOf('=') > 0) {
				args[arg.split('=')[0]] = arg.split('=')[1];
			} else {
				args[arg] = true;
			}
		}
	});
	return args;
})();

// ignore files we don't have control over
var excluded = [
	'rendertools',
	'_preview',
	'ckeditor',
	'jquery-ui',
	'jquery',
	'compiled',
	'greenfield',
	'jwplayer',
	'swfobject',
	'WriteCapture',
	'jmol',
	'raphael',
	'yui',
	'min.js',
	'ie6'
];

(function(jshint, finder, fs, reporter) {
	var paths = [],
		status = 0,
		count = 0;

	var validate = function() {
		setTimeout(function() {
			if (reporter.hasLoaded(paths.length)) {
				paths.map(function(path) {
					fs.readFile(path, 'utf-8', function(err, data) {
						jshint.JSHINT(data, {
							curly: true,
							eqeqeq: true,
							forin: true,
							immed: true,
							newcap: true,
							undef: true,
							latedef: true,
							trailing: true,
							white: true,
							/* now suppress some errors */
							shadow: true,
							sub: true,
							scripturl: true,
							/* environment */
							browser: true,
							jquery: true,
							wsh: true,
							nonstandard: true
						});

						var data = jshint.JSHINT.data(),
							types = ['closure', 'outer', 'param', 'var'],
							varNames = {};

						data.functions.forEach(function(fn) {
							types.forEach(function(type) {
								if (fn[type] && fn[type].length) {
									fn[type].forEach(function(name) {
										varNames[name] = 'appears in ' + fn.name + ' at around line ' + fn.line;
									});
								}
							});
						});

						var invalidVarNames = Object.keys(varNames).filter(function(name) {
							if (name === '$') { // jQuery
								return false;
							}
							if (name.match(/^[A-Z][A-Z_]+$/)) { // SOME_CONSTANT_VALUE
								return false;
							}
							if (name.match(/[A-Z]{2,}/)) { // disallow someHTML should be someHtml
								return true;
							}
							if (name.match(/^_?\$?[a-z][a-zA-Z0-9]*$/)) { // $myVar, myVar, _myVar or _$myVar
								return false;
							}
							if (name.match(/^[A-Z][a-z0-9][a-zA-Z0-9]*$/)) { // MyClass
								return false;
							}
							return true;
						});

						if (invalidVarNames.length) {
							if (!jshint.JSHINT.errors) {
								jshint.JSHINT.errors = [];
							}
							invalidVarNames.forEach(function(name) {
								jshint.JSHINT.errors.push({
									reason: 'Invalid variable name',
									evidence: name + ' ' + varNames[name],
									character: 'Unknown',
									line: 'Unknown'
								});
							});
						}
						
						if (jshint.JSHINT.errors && jshint.JSHINT.errors.length) {
							jshint.JSHINT.errors.forEach(function(err) {
								if (err) {
									var message = {
										type: 'error',
										message: err.reason + ' ' + ((typeof err.evidence !== 'undefined') ? err.evidence.replace(/^\s+/, '') : ''),
										col: err.character,
										line: err.line
									};
									status = reporter.record(message, path) || status;
								}
							});
						}
						if (++count === paths.length) {
							reporter.summarise();
							process.exit(status);
						}
					});
				});
			} else {
				setTimeout(arguments.callee, 100);
			}
		}, 100);
	};
	
	var isValidPath = function(path) {
		return excluded.reduce(function(prev, current) {
			return prev && path.indexOf(current) === -1;
		}, path.match(/\.js$/));
	};
	
	if (args.files) {
		paths = args.files.split(',').map(function(val) {
			return process.cwd() + '/' + val;
		}).filter(function(path) {
			return isValidPath(path);
		});
		paths.forEach(function(path) {
			reporter.loadFile(path)
		});
		validate();
	} else {
		var emitter =  finder(args.path || process.cwd());
		// get a list of all files that don't match the excluded list
		emitter.on('file', function(path) {
			if (isValidPath(path)) {
				paths.push(path);
				reporter.loadFile(path);
			}
		});
		emitter.on('end', validate);
	}

})(require('jshint'), require('walkdir'), require('fs'), require('./lib/reporter')(args));