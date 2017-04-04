module.exports = function (grunt) {
  grunt.initConfig({
    puglint: {
      taskName: {
        src: ['**/*.jade']
      }
    },
    less: {
      development: {
        options: {
          compress: true,
          yuicompress: true,
          optimization: 100,
          syncImport: true,
          strictImports: true
        },
        files: {
          'css/main.css': 'less/main.less'
        }
      }
    },
    jade: {
      compile: {
        options: {
          pretty: false
        },
        files: {
          'index.html': ['jade/index.jade']
        }
      }
    },
    jade_pages: {
      compile: {
        options: {
          pretty: false
        },
        files: {
          'index.html': ['jade/index.jade']
        }
      }
    },
    uglify: {
      options: {
        mangle: false
      },
      my_target: {
        files: {
          'js/main.min.js': ['js/main.js'],
          'js/game.min.js': ['js/game.js']
        }
      }
    },
    zip: {
      'R40.zip': ['assets', 'index.html']
    },
    copy: {
      main: {
        expand: true,
        src: ['assets/*', 'index.html', 'R40.zip'],
        dest: '/Users/Consalvo/Sites/'
      }
    },
    watch: {
      jade: {
        files: ['jade/**/*.jade', 'css/**/*.css', 'js/**/*.min.js'], // which files to watch
        tasks: ['jade', 'zip', 'copy'],
        options: {
          nospawn: true
        }
      },
      less: {
        files: ['less/**/*.less'], // which files to watch
        tasks: ['less', 'jade', 'zip', 'copy'],
        options: {
          nospawn: true
        }
      },
      uglify: {
        files: ['js/**/*.js', '!js/**/*.min.js'],
        tasks: ['uglify', 'jade', 'zip', 'copy'],
        options: {
          nospawn: true
        }
      }
    }
  })

  grunt.loadNpmTasks('grunt-puglint')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-zip')
  grunt.loadNpmTasks('grunt-contrib-less')
  grunt.loadNpmTasks('grunt-contrib-uglify')
  grunt.loadNpmTasks('grunt-contrib-jade')
  grunt.loadNpmTasks('grunt-contrib-watch')

  grunt.registerTask('default', ['puglint', 'uglify', 'less', 'jade', 'zip', 'copy', 'watch'])
  grunt.registerTask('build', ['uglify', 'less', 'jade', 'zip', 'copy'])
}
