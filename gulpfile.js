'use strict';

var gulp = require('gulp');
var eslint = require('gulp-eslint');
var uglify = require('gulp-uglify');
var cleanCSS = require('gulp-clean-css');
var sourcemaps = require('gulp-sourcemaps');
var pump = require('pump');

var scriptsPath = 'assets/*.js';
var stylesPath = 'assets/*.css';
var lintConfig = {
  rules: {
    'no-unused-vars': 1,
    'indent': ['warn', 2]
  },
  envs: [ 'browser']
};

gulp.task('lint', function() {

  return gulp.src([scriptsPath, '!node_modules/**'])
  .pipe(eslint(lintConfig))
  .pipe(eslint.format())
  .pipe(eslint.failAfterError());
});

gulp.task('js-compress', function(cb) {

  pump([
    gulp.src(scriptsPath),
    sourcemaps.init({ loadMaps: true }),
    uglify(),
    sourcemaps.write('maps'),
    gulp.dest('dest')
  ], cb);
});

gulp.task('css-compress', function(cb) {

  pump([
    gulp.src(stylesPath),
    cleanCSS({compatibility: 'ie9'}),
    gulp.dest('dest')
  ], cb);
});

gulp.task('default', ['lint', 'js-compress', 'css-compress']);

gulp.task('watcher', function() {

  gulp.watch(scriptsPath, ['js-compress', 'css-compress']);
});
