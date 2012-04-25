
module.exports = [
	{
		id: 'color-shorthand',
		name: 'Use shorthand color values where possible',
		desc: 'Disallow #aabbcc and rgb() color values in cases where #abc could be used',
		browsers: 'All',
		init: function(parser, reporter) {
			var rule = this;

			parser.addListener('property', function(e) {
				var parts = e.value.parts,
					n = parts.length,
					i = 0,
					rgb = null;

				while (i < n) {
					if (parts[i].type === 'color') {
						rgb = null;
						if (parts[i].text.match(/^#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3$/i)) {
							reporter.report('The value ' + parts[i].text + ' should be written more compactly as #' + RegExp.$1 + RegExp.$2 + RegExp.$3, parts[i].line, parts[i].col, rule);
						} else if (parts[i].text.match(/^rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)$/)) {
							rgb = [RegExp.$1, RegExp.$2, RegExp.$3].map(function(val) {
								return parseInt(val, 10);
							});
						} else if (parts[i].text.match(/^rgb\(\s*([0-9]{1,3})%\s*,\s*([0-9]{1,3})%\s*,\s*([0-9]{1,3})%\s*\)$/)) {
							rgb = [RegExp.$1, RegExp.$2, RegExp.$3].map(function(val) {
								return Math.min(Math.round(parseInt(val, 10) / 100 * 255), 255);
							});
						}
						if (rgb) {
							if (rgb[0] % 17 === 0 && rgb[1] % 17 === 0 && rgb[2] % 17 === 0) {
								reporter.report('The value ' + parts[i].text + ' should be written more compactly as #' + rgb.map(function(val) {
									return val.toString(16).substr(0, 1);
								}).join(''), parts[i].line, parts[i].col, rule);
							} else {
								reporter.report('The value ' + parts[i].text + ' should be written as #' + rgb.map(function(val) {
									val = val.toString(16);
									return val.length === 1 ? '0' + val : val;
								}).join(''), parts[i].line, parts[i].col, rule);
							}
						}
					}
					++i;
				}
			});
		}
	},
	{
		id: 'well-formed-selectors',
		name: 'Selectors should conform to house style',
		desc: 'Selectors should conform to house style - all lowercase, words in class names should be separated by -',
		browsers: 'All',
		init: function(parser, reporter) {
			var rule = this;

			parser.addListener('endrule', function(e) {
				var selectors = e.selectors,
					n = selectors.length,
					i = 0,
					parts = null;

				while (i < n) {
					if (!selectors[i].text.match(/^[*.#a-z][-a-z0-9:.#()\[\]|+~>*^$="' ]*$/)) {
						reporter.report('The selector "' + selectors[i].text + '" doesn\'t conform to house style.', selectors[i].line, selectors[i].col, rule);
					}
					++i;
				}
			});
		}
	},
	{
		id: 'default-values',
		name: 'Property contains possibly redundant default values',
		desc: 'Did you copy this from firebug? This property contains values that look like browser defaults',
		browsers: 'All',
		init: function(parser, reporter) {
			var rule = this;

			parser.addListener('property', function(e) {
				var parts = e.value.parts,
					n = parts.length;

				if (e.property.text === 'background' || e.property.text === 'background-attachment') {
					while (n--) {
						if (parts[n].text === 'scroll') {
							reporter.report(e.property.text + ': ' + e.value.text + '; scroll is the default value - could probably be omitted', parts[n].line, parts[n].col, rule);
							break;
						}
					}
				} else if (e.property.text.indexOf('border') !== -1 || e.property.text.indexOf('outline') !== -1) {
					while (n--) {
						if (parts[n].text === '-moz-use-text-color') {
							reporter.report(e.property.text + ': ' + e.value.text + '; did you copy and paste from firebug?', parts[n].line, parts[n].col, rule);
							break;
						}
					}
				}
			});
		}
	},
	{
		id: 'url-values-should-not-be-quoted',
		name: 'url values should not have quotes',
		desc: '',
		browsers: 'All',
		init: function(parser, reporter) {
			var rule = this;

			parser.addListener('property', function(e) {
				var parts = e.value.parts,
					n = parts.length;

				while (n--) {
					if (parts[n].type === 'uri' && parts[n].text.match(/^url\(["'].*?["']\)/)) {
						reporter.report(parts[n].text + ' url values should not be wrapped with quotes', parts[n].line, parts[n].col, rule);
					}
				}
			});
		}
	},
	{
		id: 'font-size-should-use-percentages',
		name: 'font-size should be set as a percentage',
		desc: 'Font sizes should be set as a percentage',
		browsers: 'All',
		init: function(parser, reporter) {
			var rule = this;
			
			parser.addListener('property', function(e) {
				var parts, n;
				
				if (e.property.text === 'font' || e.property.text === 'font-size') {
					parts = e.value.parts;
					n = parts.length;
					
					while (n--) {
						if (parts[n].type === 'length') {
							reporter.report('Font size should use percentages (' + e.value.text + ')', parts[n].line, parts[n].col, rule);
						}
					}
				}
			});
		}
	},
	{
		id: 'one-property-per-line',
		name: 'We should use one property per line',
		desc: 'For easier diffs we should write css with one property per line',
		browsers: 'All',
		init: function(parser, reporter) {
			var rule = this, 
				lastLine = 0;

			parser.addListener('property', function(e) {
				if (e.property.line === lastLine) {
					reporter.report('The property ' + e.property.text + ': ' + e.value.text + ' should be on a new line', e.property.line, e.property.col, rule);
				}
				lastLine = e.property.line;
			});
			parser.addListener('startrule', function(e) {
				e.selectors.map(function(selector) {
					if (selector.line === lastLine) {
						reporter.report('The selector "' + selector.text + '" should be on a new line', selector.line, selector.col, rule);
					}
					lastLine = selector.line;
				});
			});
		}
	},
	{
		id: 'properties-should-be-lowercase',
		name: 'Properties should be lowercase',
		desc: 'Only use lowercase for CSS property names',
		browsers: 'All',
		init: function(parser, reporter) {
			var rule = this;
			
			parser.addListener('property', function(e) {
				if (e.property.text.toLowerCase() !== e.property.text) {
					reporter.report('The property "' + e.property.text + '" should be lowercase', e.property.line, e.property.col, rule);
				}
			});
		}
	}
];
