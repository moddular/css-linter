// settings
var FILE_ENCODING = 'utf-8',
    EOL = '\n';

 
(function(fs, finder, uglifyJS ,reporter) {

    var excluded = [];
    var paths = [];
    var repositoryRoot = process.cwd();

    var part
    /* concatenat files  - no longer needed with uglifyjs2 */
    var concat = function(opts) {
        var fileList = opts.src;
        var distPath = opts.dest;
        var out = fileList.map(function(filePath){
                console.log(filePath);
                return fs.readFileSync(filePath, FILE_ENCODING);
            });
        fs.writeFileSync(distPath, out.join(EOL), FILE_ENCODING);
        console.log(' '+ distPath +' built.');
    }

    /* minify javascript */
    var uglify = function (srcPath, distPath) {
        var minifiedScript = uglifyJS.minify(srcPath);
        fs.writeFileSync(distPath, minifiedScript.code, FILE_ENCODING);
    }
 
    /* helper to see if valid path mased on regular expression provided as match parameter */
    var isValidPath = function(path, match) {
            return excluded.reduce(function(prev, current) {
            return prev && path.indexOf(current) === -1;
        }, path.match(match));
    };

    var compileFileList = function() {
        var emitter = finder(process.cwd());
        // get a list of all files that don't match the excluded list
        emitter.on('file', function(path) {
            if (isValidPath(path, "\\.js$")) {
                paths.push(path);
            }
        });
    }
    var setupConcat = function (concatList) {
        uglify(concatList, "test-build.min.js")
    }

    var velocityConfigParser = function() {
        var concatList = [];
        
        var matchConfig = function(aConfigFile) {
            var lineArray =  aConfigFile.split('\n');

            lineArray.forEach(function(line) {
                if (line.match("nConfig.scripts.+\\.js")) {
                   var match = line.match(/nConfig.global.scripts}(.*)/)
                   var pathToJSfiles = repositoryRoot + '/scripts' +  match[1].substring(0, match[1].length -3);
                   concatList.push(pathToJSfiles);
                }
            });
            return concatList
        }

        paths.map(function(filePath) {
            var aConfigFile = fs.readFileSync(filePath, FILE_ENCODING);  
            var conCatList = matchConfig(aConfigFile);
            setupConcat(concatList)

        });
        
    }

    var velocityConfigFinder = function() {
        var configSrc = [
            "configs/global.config.vm",
            "configs/global.article.vm"
        ];
        // get a list of all files that don't match the excluded list

        configSrc.forEach(function(path) {
            var fullPath = repositoryRoot + "/" + path;
            if (isValidPath(fullPath, "\\.vm$")) {
                paths.push(fullPath);
            }
        });
        velocityConfigParser();

    }
    velocityConfigFinder();

})(require('fs'), require('walkdir'), require('uglify-js'), require('./lib/reporter'))    



