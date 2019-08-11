// Explanation of test setup:
module.exports = require('./webpack.config.js')
module.exports.target = 'node';

// Solve: Module not found: 'fs' in '/home/mark/p/enigma/node_modules/mkdirp'
module.exports.node = { fs: 'empty' };

// Solve: Critical dependency: the request of a dependency is an expression
module.exports.module.exprContextCritical = false;
