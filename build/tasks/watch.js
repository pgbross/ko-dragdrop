var gulp = require('gulp')
var paths = require('../paths')
var runSequence = require('run-sequence')

gulp.task('watch', function(callback) {
  gulp.watch(paths.source, ['build'])

  callback()
})


gulp.task('default', function(callback){
  return runSequence( 'watch',['build'], callback)
} )
