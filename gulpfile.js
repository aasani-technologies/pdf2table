const gulp = require('gulp');
const minify = require('gulp-minify');
const ts = require('gulp-typescript');
const tsProject = ts.createProject('tsconfig.json');
const merge = require('merge2');
const sourcemaps = require('gulp-sourcemaps');
const isProduction =
  (process.env.NODE_ENV || 'development').trim().toLowerCase() === 'production';

gulp.task('default', () => {
  const tsProjectResult = tsProject
    .src()
    .pipe(sourcemaps.init())
    .pipe(tsProject());

  let jsResult = tsProjectResult.js;
  if (isProduction) {
    jsResult = jsResult.pipe(
      minify({
        ext: {
          min: '.js',
        },
        noSource: true,
      })
    );
  }
  jsResult = jsResult.pipe(sourcemaps.write()).pipe(gulp.dest('build'));

  const tsResult = tsProjectResult.dts.pipe(gulp.dest('build'));
  return merge([tsResult, jsResult]);
});
