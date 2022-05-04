const gulp = require('gulp');
const minify = require('gulp-minify');
const ts = require('gulp-typescript');
const tsProject = ts.createProject('tsconfig.json');
gulp.task('default', () => {
  return tsProject
    .src()
    .pipe(tsProject())
    .js.pipe(
      minify({
        ext: {
          min: '.js',
        },
        noSource: true,
      })
    )
    .pipe(gulp.dest('build'));
});
