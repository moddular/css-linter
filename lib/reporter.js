
module.exports = function(args) {
	var cp = require('child_process'),
		data = {},
		counts = {warning: 0, error: 0},
		userCounts = {};
	
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
				user = blame.split(/\s+/).filter(function(val) {
					return (val.indexOf('(') === 0);
				})[0].replace(/\(/, '');
				
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
				maxPositionLength = 0,
				maxNameLength = 0,
				maxErrorCountLength = 0;
			
			Object.keys(userCounts).forEach(function(user) {
				list.push({name: user, warnings: userCounts[user].warning, errors: userCounts[user].error});
			});
			
			if (!list.length) {
				return false;
			}
			
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
			
			maxPositionLength = (list.length + 1).toString().length;
			maxNameLength = list.map(function(val) { return val.name.length; }).reduce(function(prev, curr) { return Math.max(prev, curr); });
			maxErrorCountLength = list.map(function(val) { return val.errors.toString().length; }).reduce(function(prev, curr) { return Math.max(prev, curr); });
			
			list.forEach(function(user, i) {
				var pos = i + 1,
					posPadding = Array(maxPositionLength - pos.toString().length + 2).join(' '),
					namePadding = Array(maxNameLength - user.name.length + 15).join(' '),
					errorsPadding = Array(maxErrorCountLength - user.errors.toString().length + 5).join(' ');
					
				console.log(pos + posPadding + user.name + namePadding + user.errors + errorsPadding + user.warnings);
			});
			console.log('');
			
		} : function() { },
		
		log: function(message, path, user) {
			if (user) {
				if (!userCounts.hasOwnProperty(user)) {
					userCounts[user] = {warning: 0, error: 0};
				}
				userCounts[user][message.type]++;
				console.log(user);
			}
			
			counts[message.type]++;
			
			console.log('[' + message.type.toUpperCase() + '] ' + message.message);
			console.log('In ' + path + ' at line ' + message.line + ' column ' + message.col);
			console.log('\n');
			
			return message.type === 'error' ? 1 : 0;
		}
	};
};
