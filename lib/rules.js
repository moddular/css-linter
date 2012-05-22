
module.exports = [
	{
		id: 'color-shorthand',
		name: 'MUST use shorthand color values where possible',
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
						if (parts[i].text.toLowerCase() !== parts[i].text) {
							reporter.report('The value ' + parts[i].text + ' MUST be written in lowercase', parts[i].line, parts[i].col, rule);
						}
						
						if (parts[i].text.match(/^#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3$/i)) {
							reporter.report('The value ' + parts[i].text + ' MUST be written more compactly as #' + RegExp.$1 + RegExp.$2 + RegExp.$3, parts[i].line, parts[i].col, rule);
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
								reporter.report('The value ' + parts[i].text + ' MUST be written more compactly as #' + rgb.map(function(val) {
									return val.toString(16).substr(0, 1);
								}).join(''), parts[i].line, parts[i].col, rule);
							} else {
								reporter.report('The value ' + parts[i].text + ' MUST be written as #' + rgb.map(function(val) {
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
		name: 'Selectors MUST conform to house style',
		desc: 'Selectors MUST conform to house style - all lowercase, words in class names should be separated by -',
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
		desc: 'Did you copy this from firebug? SHOULD avoid using property values that look like browser defaults',
		browsers: 'All',
		init: function(parser, reporter) {
			var rule = this;

			parser.addListener('property', function(e) {
				var parts = e.value.parts,
					n = parts.length;

				if (e.property.text === 'background' || e.property.text === 'background-attachment') {
					while (n--) {
						if (parts[n].text === 'scroll') {
							reporter.report(e.property.text + ': ' + e.value.text + '; scroll is the default value - SHOULD probably be omitted', parts[n].line, parts[n].col, rule);
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
		name: 'url values MUST not have quotes',
		desc: 'url values MUST not be wrapped in quotes',
		browsers: 'All',
		init: function(parser, reporter) {
			var rule = this;

			parser.addListener('property', function(e) {
				var parts = e.value.parts,
					n = parts.length;

				while (n--) {
					if (parts[n].type === 'uri' && parts[n].text.match(/^url\(["'].*?["']\)/)) {
						reporter.report(parts[n].text + ' url values MUST not be wrapped with quotes', parts[n].line, parts[n].col, rule);
					}
				}
			});
		}
	},
	{
		id: 'font-size-should-use-percentages',
		name: 'font-size MUST be set as a percentage',
		desc: 'All font sizes MUST be set using percentages',
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
							reporter.report('Font size MUST use percentages (' + e.value.text + ')', parts[n].line, parts[n].col, rule);
						}
					}
				}
			});
		}
	},
	{
		id: 'one-property-per-line',
		name: 'We MUST use one property per line',
		desc: 'CSS MUST have be written with one property per line for easier diffs',
		browsers: 'All',
		init: function(parser, reporter) {
			var rule = this, 
				lastLine = 0;

			parser.addListener('property', function(e) {
				if (e.property.line === lastLine) {
					reporter.report('The property ' + e.property.text + ': ' + e.value.text + ' MUST be on a new line', e.property.line, e.property.col, rule);
				}
				lastLine = e.property.line;
			});
			parser.addListener('startrule', function(e) {
				e.selectors.map(function(selector) {
					if (selector.line === lastLine) {
						reporter.report('The selector "' + selector.text + '" MUST be on a new line', selector.line, selector.col, rule);
					}
					lastLine = selector.line;
				});
			});
		}
	},
	{
		id: 'properties-should-be-lowercase',
		name: 'Properties MUST be lowercase',
		desc: 'Only use lowercase for CSS property names',
		browsers: 'All',
		init: function(parser, reporter) {
			var rule = this;
			
			parser.addListener('property', function(e) {
				if (e.property.text.toLowerCase() !== e.property.text) {
					reporter.report('The property "' + e.property.text + '" MUST be lowercase', e.property.line, e.property.col, rule);
				}
			});
		}
	},
	{
		id: 'property-ordering',
		name: 'Properties should be ordered by vendor prefix, -webkit first to unprefixed last',
		desc: 'Other browsers may implement -webkit properties, so -webkit MUST appear first',
		browsers: 'All',
		init: function(parser, reporter) {
			var rule = this,
				found = {},
				properties = {
					'-webkit-border-radius': 'border-radius',
					'-webkit-border-top-left-radius': 'border-top-left-radius',
					'-webkit-border-top-right-radius': 'border-top-right-radius',
					'-webkit-border-bottom-left-radius': 'border-bottom-left-radius',
					'-webkit-border-bottom-right-radius': 'border-bottom-right-radius',

					'-moz-border-radius': 'border-radius',
					'-moz-border-radius-topleft': 'border-top-left-radius',
					'-moz-border-radius-topright': 'border-top-right-radius',
					'-moz-border-radius-bottomleft': 'border-bottom-left-radius',
					'-moz-border-radius-bottomright': 'border-bottom-right-radius',

					'-moz-column-count': 'column-count',
					'-webkit-column-count': 'column-count',

					'-moz-column-gap': 'column-gap',
					'-webkit-column-gap': 'column-gap',

					'-moz-column-rule': 'column-rule',
					'-webkit-column-rule': 'column-rule',

					'-moz-column-rule-style': 'column-rule-style',
					'-webkit-column-rule-style': 'column-rule-style',

					'-moz-column-rule-color': 'column-rule-color',
					'-webkit-column-rule-color': 'column-rule-color',

					'-moz-column-rule-width': 'column-rule-width',
					'-webkit-column-rule-width': 'column-rule-width',

					'-moz-column-width': 'column-width',
					'-webkit-column-width': 'column-width',

					'-webkit-column-span': 'column-span',
					'-webkit-columns': 'columns',

					'-moz-box-shadow': 'box-shadow',
					'-webkit-box-shadow': 'box-shadow',

					'-moz-transform' : 'transform',
					'-webkit-transform' : 'transform',
					'-o-transform' : 'transform',
					'-ms-transform' : 'transform',

					'-moz-transform-origin' : 'transform-origin',
					'-webkit-transform-origin' : 'transform-origin',
					'-o-transform-origin' : 'transform-origin',
					'-ms-transform-origin' : 'transform-origin',
					
					'-moz-transition': 'transition',
					'-ms-transition': 'transition',
					'-o-transition': 'transition',
					'-webkit-transition': 'transition',
					
					'-moz-transition-delay': 'transition-delay',
					'-ms-transition-delay': 'transition-delay',
					'-o-transition-delay': 'transition-delay',
					'-webkit-transition-delay': 'transition-delay',
					
					'-moz-transition-duration': 'transition-duration',
					'-ms-transition-duration': 'transition-duration',
					'-o-transition-duration': 'transition-duration',
					'-webkit-transition-duration': 'transition-duration',
					
					'-moz-transition-property': 'transition-property',
					'-ms-transition-property': 'transition-property',
					'-o-transition-property': 'transition-property',
					'-webkit-transition-property': 'transition-property',
					
					'-moz-transition-timing-function': 'transition-timing-function',
					'-ms-transition-timing-function': 'transition-timing-function',
					'-o-transition-timing-function': 'transition-timing-function',
					'-webkit-transition-timing-function': 'transition-timing-function',

					'-moz-box-sizing' : 'box-sizing',
					'-webkit-box-sizing' : 'box-sizing',

					'-moz-user-select' : 'user-select',
					'-khtml-user-select' : 'user-select',
					'-webkit-user-select' : 'user-select',
					
					'-ms-text-size-adjust': 'text-size-adjust',
					'-webkit-text-size-adjust': 'text-size-adjust'
				},
				order = {
					'border-radius': ['webkit', 'moz', ''],
					'border-top-left-radius': ['webkit', 'moz', ''],
					'border-top-right-radius': ['webkit', 'moz', ''],
					'border-bottom-right-radius': ['webkit', 'moz', ''],
					'border-bottom-left-radius': ['webkit', 'moz', ''],
					'box-shadow': ['webkit', 'moz', ''],
					'box-sizing': ['webkit', 'moz', ''],
					'column-count': ['webkit', 'moz', ''],
					'column-gap': ['webkit', 'moz', ''],
					'column-rule': ['webkit', 'moz', ''],
					'column-rule-style': ['webkit', 'moz', ''],
					'column-rule-color': ['webkit', 'moz', ''],
					'column-rule-width': ['webkit', 'moz', ''],
					'column-span': ['webkit', ''],
					'column-width': ['webkit', 'moz', ''],
					'columns': ['webkit', ''],
					'text-size-adjust': ['webkit', 'ms', ''],
					'transform': ['webkit', 'moz', 'ms', 'o', ''],
					'transform-origin': ['webkit', 'moz', 'ms', 'o', ''],
					'transition': ['webkit', 'moz', 'ms', 'o', ''],
					'transition-delay': ['webkit', 'moz', 'ms', 'o', ''],
					'transition-duration': ['webkit', 'moz', 'ms', 'o', ''],
					'transition-property': ['webkit', 'moz', 'ms', 'o', ''],
					'transition-timing-function': ['webkit', 'moz', 'ms', 'o', ''],
					'user-select': ['webkit', 'khtml', 'moz', ''],
				};
			
			parser.addListener('startrule', function(e) {
				found = {};
			});
			parser.addListener('property', function(e) {
				var name = e.property.text.toLowerCase();
				
				if (properties[name]) {
					if (!found[properties[name]]) {
						found[properties[name]] = [];
					}
					if (/^-(webkit|moz|ms|o|khtml)-/.test(name)) {
						found[properties[name]].push(RegExp.$1);
					}
				} else if (order[name]) {
					if (!found[name]) {
						found[name] = [];
					}
					found[name].push('');
				}
					
			});
			parser.addListener('endrule', function(e) {
				Object.keys(found).forEach(function(prop) {
					var prefixes = order[prop],
						n = found[prop].length,
						ok = true;
					
					while (n--) {
						if (n >= prefixes.length || prefixes[n] !== found[prop][n]) {
							ok = false;
						}
					}
					
					prefixes[prefixes.length - 1] = 'non-prefixed';
					if (!ok) {
						reporter.report(prop + ' definitions MUST be in order ' + prefixes.join(', '), e.selectors[0].line, e.selectors[0].col, rule);
					}
				});
			});
		}
	},
	{
		id: 'gradient-ordering',
		name: 'If using css gradients, -webkit MUST be first',
		desc: 'Other browsers may implement -webkit properties, so -webkit MUST appear first',
		browsers: 'All',
		init: function(parser, reporter) {
			var rule = this,
				order = ['webkit-old', 'webkit', 'moz', 'ms', 'o', ''],
				gradients;
			
			parser.addListener('startrule', function(e) {
				gradients = [];
			});
			parser.addListener('property', function(e) {
				if (/-webkit-gradient/i.test(e.value)) {
					gradients.push('webkit-old');
				} else if (/-(moz|ms|o|webkit)(?:-(?:linear|radial))-gradient/i.test(e.value)) {
					gradients.push(RegExp.$1);
				} else if (/(linear|radial)-gradient/i.test(e.value)) {
					gradients.push('');
				}
			});
			parser.addListener('endrule', function(e) {
				var ok = true,
					n = gradients.length;
				
				if (n) {
					while (n--) {
						if (n >= order.length || order[n] !== gradients[n]) {
							ok = false;
							break;
						}
					}
					if (!ok) {
						reporter.report('Gradient definitions MUST be in order webkit (old style, then new), moz, ms, o and non-prefixed', e.selectors[0].line, e.selectors[0].col, rule);
					}
				}
			});
		}
	},
	{
		id: 'use-absolute-paths',
		name: 'Paths MUST be absolute',
		desc: '',
		browsers: 'All',
		init: function(parser, reporter) {
			var rule = this;
			
			parser.addListener('property', function(e) {
				var parts = e.value.parts,
					n = parts.length;

				while (n--) {
					if (parts[n].type === 'uri') {
						if (!parts[n].text.match(/^url\(\/.+/) && !parts[n].text.match(/^url\(["']\/.+/)) { // doesn't start with a /
							var isUrl = parts[n].text.match(/^url\(http:\/\/([^\/]+)/);
							if (!isUrl || RegExp.$1 === 'www.nature.com') {
								reporter.report(parts[n].text + ' url values MUST be absolute paths', parts[n].line, parts[n].col, rule);
							}
						}
					}
				}
			});
		}
	},
	{
		id: 'formatting',
		name: 'Formatting rules',
		desc: 'All properties MUST appear on their own line with a single hard tab indentation and there MUST be a single space between the : and the property value',
		browsers: 'All',
		init: function(parser, reporter) {
			var rule = this;
			
			parser.addListener('property', function(e) {
				if (e.col !== 2) {
					reporter.report(e.property.text + ' property MUST be indented by 1 hard tab', e.property.line, e.property.col, rule);
				}
				if (e.col + e.property.text.length + 2 !== e.value.col) {
					reporter.report(e.property.text + ' property MUST be formated as property: value', e.property.line, e.property.col, rule);
				}
			});
		}
	}
];
