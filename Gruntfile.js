/* jshint esversion: 6 */

const semver = require("semver");


module.exports = function(grunt)
{
  var pkg = grunt.file.readJSON('package.json');

  var nextVer = semver.inc(pkg.version, 'patch');

  grunt.initConfig(
  {

    // Package
    pkg: pkg,

    // JSHint
    jshint:
    {
      all: ['Gruntfile.js', 'lib/**/*.js', 'index.js', 'tst/**/*.js', '!**.arch*/**'],
      options:
      {
        node: true,
        esversion: 6,
        strict: false,
        expr: true, // allow tenery operator w/out assignment
        laxbreak: true,
        "-W138": true, // Allow: Regular parameters should not come after default parameters
      }
    },

    // Tests
    mochaTest:
    {
      test:
      {
        options:
        {
          reporter: 'spec',
          bail: true
        },
        src: ['tst/_index.js']
      }
    },

    // Git
    gitadd:
    {
      deploy:
      {
        options:
        {
          all: true
        }
      }
    },
    gitpush:
    {
      deploy:
      {
        options:
        {
          branch: 'master',
        }
      }
    },

    exec:
    {
      // Update
      update: 'npm update',

      // Patch
      patch: 'npm version patch',

      // Publish
      publish: 'npm publish --access public',
    },

  });


  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-git');
  grunt.loadNpmTasks('grunt-mocha-test');


  grunt.registerTask('develop', 'develop', ['jshint', 'mochaTest']);

  grunt.registerTask('update', 'update dependencies', ['exec:update', 'mochaTest']);

  grunt.registerTask('deploy', 'deploy', ['exec:update', 'develop', 'gitadd:deploy', 'exec:patch']);

  grunt.registerTask('publish', 'publish', ['deploy', 'gitpush:deploy', 'exec:publish']);


};
