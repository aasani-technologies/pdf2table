const gulp = require('gulp');
const minify = require('gulp-minify');
const ts = require('gulp-typescript');
const tsProject = ts.createProject('tsconfig.json');
const merge = require('merge2');
const sourcemaps = require('gulp-sourcemaps');

gulp.task('default', () => {
  const tsResult = tsProject.src().pipe(sourcemaps.init()).pipe(tsProject());

  return merge([
    tsResult.dts.pipe(gulp.dest('build')),
    tsResult.js
      .pipe(
        minify({
          ext: {
            min: '.js',
          },
          noSource: true,
        })
      )
      .pipe(sourcemaps.write())
      .pipe(gulp.dest('build')),
  ]);
});
