const gulp = require('gulp');
const babel = require('gulp-babel');
const cssmin = require('gulp-cssmin');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const concat = require('gulp-concat');
const autoprefixer = require('gulp-autoprefixer');
const pump = require('pump');
const imageop = require('gulp-image-optimization');

gulp.task('minify', function(){
   gulp.src(['./styles/main.css'])
   .pipe(autoprefixer({
       browsers: ['last 2 versions']
   }))
   .pipe(cssmin())
   .pipe(concat('main.css'))
   .pipe(rename("main.min.css"))
   .pipe(gulp.dest('./public/styles'));
});

gulp.task('babelify', () => {
    return gulp.src('./scripts/main.js')
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(gulp.dest('./public/scripts'));
});

gulp.task('compress', function (cb) {
  pump([
        gulp.src('public/scripts/*.js'),
        uglify(),
        gulp.dest('public/scripts')
    ],
    cb
  );
});

gulp.task('images', function(cb) {
    gulp.src(['*.png','*.jpg','*.gif','*.jpeg']).pipe(imageop({
        optimizationLevel: 5,
        progressive: true,
        interlaced: true
    })).pipe(gulp.dest('public/images')).on('end', cb).on('error', cb);
});

gulp.task('build', ['babelify'], function () {
    gulp.start('compress');
    gulp.start('minify');
});

gulp.task('generate-service-worker', function(callback) {
  var path = require('path');
  var swPrecache = require('sw-precache');
  var rootDir = 'public';

  swPrecache.write(path.join(rootDir, 'sw.js'), {
    staticFileGlobs: [rootDir + '/**/*.{js,html,css,png,jpg,gif}'],
    stripPrefix: rootDir
  }, callback);
});