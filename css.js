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
	'polopoly/stylesheets',
	'polopoly/help',
	'rendertools',
	'_preview',
	'ckeditor',
	'jquery-ui',
	'css/jquery',
	'compiled',
	'css/commons',
	'greenfield',
	'yui.css',
	'reset.css',
	'min.css'
];

var IS_WARNING = 1;
var IS_ERROR = 2;

// if the list of rules to run isn't specified via the command line
// we'll use these default ones
var defaultRules = {
	/*'background-position': IS_ERROR,*/
	/*'borders': IS_ERROR,*/
	/*'color-shorthand': IS_ERROR,*/
	'compatible-vendor-prefixes': IS_ERROR,
	'default-values': IS_WARNING,
	'empty-rules': IS_ERROR,
	'errors': IS_ERROR,
	'fallback-colors': IS_WARNING,
	'font-size-should-use-percentages': IS_ERROR,
	/*'formatting': IS_ERROR,*/
	'gradients': IS_ERROR,
	'gradient-ordering': IS_ERROR,
	'import': IS_ERROR,
	'important': IS_WARNING,
	'known-properties': IS_ERROR,
	'one-property-per-line': IS_ERROR,
	'properties-should-be-lowercase': IS_ERROR,
	'property-ordering': IS_ERROR,
	'shorthand': IS_ERROR,
	'text-indent': IS_ERROR,
	'url-values-should-not-be-quoted': IS_ERROR,
	/*'use-paths-relative-from-root': IS_ERROR,*/
	'vendor-prefix': IS_ERROR,
	/*'well-formed-selectors': IS_ERROR,*/
	'zero-units': IS_ERROR
};


// ../path/to/validator/css.js --help display this message and exit
if (args.help) {
	(function() {
		var rules = {};
		rules[IS_ERROR] = [];
		rules[IS_WARNING] = [];
		
		Object.keys(defaultRules).forEach(function(rule) {
			rules[defaultRules[rule]].push(rule);
		});
		
		console.log('\nYou can control which validation rules will be run via the command line.\nThis is the full list of rules available\n');
		console.log('/path/to/css.js --errors=' + rules[IS_ERROR].join(',') + ' --warnings=' + rules[IS_WARNING].join(','));
		console.log('\nYou can remove any of these to narrow down the list of errors displayed');
		console.log('So if you wanted to only test the color-shorthand rule you could use\n');
		console.log('/path/to/css.js --errors=color-shorthand\n');
		console.log('Running without the --errors or --warnings options will run all rules\n');
		console.log('Running with the --blame option will enable checking git blame to record who is responsible for each error\n');
	})();
	process.exit(0);
}

// search command line options to see if rules have been specified by 
// --errors= or --warnings= if nothing is found there return the default rules
var rules = (function() {
	var rules = {},
		rule = null,
		hasErrors = false,
		hasWarnings = false,
		addRules = function(type, value) {
			if (args[type] && typeof args[type] === 'string') {
				args[type].split(',').forEach(function(rule) {
					rules[rule] = value;
				});
				return true;
			}
			return false;
		};
	
	hasErrors = addRules('errors', IS_ERROR);
	hasWarnings = addRules('warnings', IS_WARNING);
	if (hasErrors || hasWarnings) {
		return rules;
	}
	
	Object.keys(defaultRules).forEach(function(rule) {
		rules[rule] = defaultRules[rule];
	});
	return rules;
})();

(function(lint, finder, fs, reporter) {
	var paths = [],
		status = 0,
		count = 0;
		
	var validate = function() {
		// if we're running with the blame option it may take a moment for the git blame subprocesses to complete
		setTimeout(function() {
			if (reporter.hasLoaded(paths.length)) {
				paths.map(function(path) {
					fs.readFile(path, 'utf8', function(err, data) {
						if (!err) {
							// run all the validation rules
							lint.verify(data, rules).messages.forEach(function(message) {
								// reporter.record will return 0 for success and 1 if there was an error
								status = reporter.record(message, path) || status;
							});
						} else {
							console.log(err);
						}
						// and we're done. exit with a non-zero status if there are any errors to report
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
		}, path.match(/\.css$/));
	};
	
	// load our custom rules and add them to csslint
	require('./lib/rules').forEach(function(rule) {
		lint.addRule(rule);
	});
	
	if (args.files) {
		paths = args.files.split(',').map(function(val) {
			return val.charAt(0) === '/' ? val : process.cwd() + '/' + val;
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
	
})(require('csslint').CSSLint, require('walkdir'), require('fs'), require('./lib/reporter')(args));

