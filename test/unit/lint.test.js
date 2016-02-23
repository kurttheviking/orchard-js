var lint = require('mocha-eslint');

var options = {};
var paths = [
  'index.js'
];

options.formatter = 'compact';

lint(paths, options);
