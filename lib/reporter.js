
module.exports = function(args) {
	var cp = require('child_process'),
		data = {},
		counts = {warning: 0, error: 0},
		userCounts = {},
		/* parse a line of git blame to extract the user name */
		getUser = function(line) {
			var chunks = line.substring(line.indexOf('(') + 1).split(/\s+/);
			if (chunks[1] && chunks[1].match(/^[A-Z][a-z]+/)) {
				return chunks[0] + ' ' + chunks[1];
			}
			return chunks[0];
		};
	
	return {
		loaded: 0,
		
		loadFile: (args.blame) ? function(path) {
			var self = this;
			cp.exec('git blame ' + path, {maxBuffer: 1024 * 1024}, function(err, stdout, stderr) {
				data[path] = stdout.split('\n');
				self.loaded++;
			});
		} : function() { },
		
		clearFile: (args.blame) ? function(path) {
			if (data.hasOwnProperty(path)) {
				delete data[path];
			}
		} : function() { },
		
		hasLoaded: (args.blame) ? function(total) {
			return total === this.loaded;
		} : function() { 
			return true;
		},
		
		record: (args.blame) ? function(message, path) {
			var blame = (message.line && data[path] && data[path][message.line - 1]) ? data[path][message.line - 1] : '(unknown',
				user = getUser(blame);
				
			return this.log(message, path, user);
		} : function(message, path) {
			return this.log(message, path);
		},
		
		summarise: function() {
			console.log('Finished validation. ' + counts.error + ' errors, ' + counts.warning + ' warnings.');
			this.accuse();
		},
		
		accuse: (args.blame) ? function() {
			var list = [],
				userLineCounts = {},
				files = Object.keys(data),
				lines = null,
				maxPositionLength = 0,
				maxNameLength = 0,
				maxErrorCountLength = 0,
				maxWarningsCountLength = 0,
				maxLinesCountLength = 0;
			
			// take a list and a map function then reduce to find the max value
			var getMax = function(items, fn) {
				return items.map(fn).reduce(function(prev, curr) { return Math.max(prev, curr); });
			};
			
			// concatenate all the arrays from the data map into a single array
			lines = data[files[0]].concat.apply(data[files[0]], files.slice(1).map(function(key) { return data[key]; }));
			lines.forEach(function(line) {
				var user = (line) ? getUser(line) : 'unknown';
				if (userLineCounts.hasOwnProperty(user)) {
					userLineCounts[user]++;
				} else {
					userLineCounts[user] = 1;
				}
			});
			
			// create a list of users with all their stats
			Object.keys(userCounts).forEach(function(user) {
				list.push({
					name: user,
					warnings: userCounts[user].warning,
					errors: userCounts[user].error,
					lines: userLineCounts[user],
					linesPerError: (userCounts[user].error > 0) ? Math.round(userLineCounts[user] / userCounts[user].error * 1000) / 1000 : 'N/A'
				});
			});
			
			if (!list.length) {
				return false;
			}
			
			// we want the display of users to be sorted by the total number of errors and warnings
			list = list.sort(function(a, b) {
				var totalA = a.warnings + a.errors,
					totalB = b.warnings + b.errors;
					
				if (totalA > totalB) {
					return -1;
				} else if (totalA < totalB) {
					return 1;
				}
				return 0;
			});
			
			// work out nice formatting - calculate how wide each column of data is
			maxPositionLength = (list.length + 1).toString().length;
			maxNameLength = getMax(list, function(val) { return val.name.length; });
			maxErrorCountLength = getMax(list, function(val) { return val.errors.toString().length; });
			maxWarningsCountLength = getMax(list, function(val) { return val.warnings.toString().length; });
			maxLinesCountLength = getMax(list, function(val) { return val.lines.toString().length; });
			
			// display the wall of shame
			list.forEach(function(user, i) {
				var pos = i + 1,
					posPadding = Array(maxPositionLength - pos.toString().length + 2).join(' '),
					namePadding = Array(maxNameLength - user.name.length + 15).join(' '),
					errorsPadding = Array(maxErrorCountLength - user.errors.toString().length + 5).join(' '),
					warningsPadding = Array(maxWarningsCountLength - user.warnings.toString().length + 5).join(' '),
					linesPadding = Array(maxLinesCountLength - user.lines.toString().length + 5).join(' ');
					
				console.log(pos + posPadding + user.name + namePadding + user.errors + errorsPadding + user.warnings + warningsPadding + user.lines + linesPadding + user.linesPerError);
			});
			console.log('');

		} : function() { },
		
		log: function(message, path, user) {
			if (user) {
				if (!userCounts.hasOwnProperty(user)) {
					userCounts[user] = {warning: 0, error: 0};
				}
				userCounts[user][message.type]++;
			}
			
			counts[message.type]++;
			
			if (message.type === 'error' || args.verbose) {
				if (user) {
					console.log(user);
				}
				console.log('[' + message.type.toUpperCase() + '] ' + message.message);
				console.log('In ' + path + ' at line ' + message.line + ' column ' + message.col);
				console.log('\n');
			}
			
			return message.type === 'error' ? 1 : 0;
		}
	};
};
