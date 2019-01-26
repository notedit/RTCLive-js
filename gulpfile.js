var gulp = require('gulp');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var tsify = require('tsify');
var sourcemaps = require('gulp-sourcemaps');
var buffer = require('vinyl-buffer');
const PKG_INFO = require('./package.json');

gulp.task('default', function () {
    return browserify({
        basedir: '.',
        debug: true,
        entries: ['lib/index.ts'],
        extensions: ['.ts'],
        cache: {},
        packageCache: {}
    })
    .plugin(tsify)
    .transform('babelify', {
        presets: ['@babel/preset-env'],
        extensions: ['.ts']
    })
    .bundle()
    .pipe(source(PKG_INFO.name + '.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dist'));
});