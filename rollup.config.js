import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import json from 'rollup-plugin-json';
import uglify from 'rollup-plugin-uglify';
import { version } from './package.json';


export default [{
  input: 'src/index.js',
  output: {
    file: 'dist/ui-analytics.js',
    name: 'UIAnalytics',
    format: 'umd',
    banner: `/* ui-analytics.js v${version} by UIAnalytics.com */`
  },
  plugins: [
    json(),
    resolve(),
    babel({
      // only transpile our source code
      exclude: 'node_modules/**',
      plugins: ['external-helpers']
    })
  ],
  watch: {
    include: 'src/**'
  }
}, {
  input: 'src/index.js',
  output: {
    file: 'dist/ui-analytics.min.js',
    name: 'UIAnalytics',
    format: 'iife',
    banner: `/* ui-analytics.js v${version} by UIAnalytics.com */`
  },
  plugins: [
    json(),
    resolve(),
    babel({
      // only transpile our source code
      exclude: 'node_modules/**',
      plugins: ['external-helpers']
    }),
    uglify()
  ],
  watch: {
    include: 'src/**'
  }
}];
