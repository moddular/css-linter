#!/usr/bin/env node


// settings
var FILE_ENCODING = 'utf-8',
    EOL = '\n';

 
(function(fs, finder, uglifyJS ,reporter) {

    var excluded = [];
    var paths = [];
    var repositoryRoot = process.cwd();

    /* concatenat files  - no longer needed with uglifyjs2 */
    var concatFiles = function (opts) {
        var fileList = opts.src;
        var distPath = opts.dest;
        var out = fileList.map(function(filePath){
                console.log(filePath);
                return fs.readFileSync(filePath, FILE_ENCODING);
            });
        fs.writeFileSync(distPath, out.join(EOL), FILE_ENCODING);
        console.log(' '+ distPath +' built.');
    };

    /* minify javascript */
    var uglify = function (srcPath, distPath) {
        var minifiedScript = uglifyJS.minify(srcPath);
        fs.writeFileSync(distPath, minifiedScript.code, FILE_ENCODING);
    };
 
    /* helper to see if valid path mased on regular expression provided as match parameter */
    var isValidPath = function (path, match) {
            return excluded.reduce(function(prev, current) {
            return prev && path.indexOf(current) === -1;
        }, path.match(match));
    };

    var compileFileList = function () {
        var emitter = finder(process.cwd());
        // get a list of all files that don't match the excluded list
        emitter.on('file', function (path) {
            if (isValidPath(path, "\\.js$")) {
                paths.push(path);
            }
        });
    };
    var setupConcat = function (outputList, filename) {
         uglify(outputList, "scripts/build/" + filename + "-build.min.js")
    };

    var lineMatcher = function (line) {
        if (line.match("nConfig.scripts.+\\.js")) {
            var match = line.match(/nConfig.global.scripts}(.*)/)
            var pathToJSfiles = repositoryRoot + '/scripts' +  match[1].substring(0, match[1].length -3); 
            return  pathToJSfiles;     
        } else {
            return false; 
        }
    };
    var velocityConfigParser = function() {
        var outputList = [];
        
        var matchConfig = function (aConfigFile) {
            var lineArray =  aConfigFile.split('\n');
             var concatList = [];
             var blockCoordinates = [];  /*  array of start and end index of build blocks */
             var blockIndex = [];
             var blockOutput = [];

            /* iterate through array of text file and extract script config file references */
            lineArray.map(function (line, index) {
                if (line.match('start-js-build')) {
                    blockIndex[0] = index + 1;
                }  
                if (line.match('end-js-build')) {
                    blockIndex[1] = index;
                    blockCoordinates.push(blockIndex);
                    blockIndex = [];
                }     
            });
            if (blockCoordinates.length > 0) {
                /* concatenate blocks to be built */
                blockCoordinates.forEach(function (item, index) {
                    var sect = lineArray.slice(item[0], item[1])
                    blockOutput = blockOutput.concat(sect);

                });
                 /* call linematcher to confirm url and create path to file */
                blockOutput.forEach(function (line) {
                    var matchedLine = lineMatcher(line);
                        if (matchedLine !== false) {
                          concatList.push(matchedLine);
                    } 
                });
                return concatList
            } else {
                return false;
            }
        };

        paths.forEach(function (filePath, index) {
            var aConfigFile = fs.readFileSync(filePath.url, FILE_ENCODING);
            var matchedArray = matchConfig(aConfigFile)
            if (matchedArray) {
                setupConcat(matchedArray, filePath.level)
            }

        });
        process.exit(0)
        
    };

    var velocityConfigFinder = function () {
        var configSrc = [
           { "level" :  "global",
             "url"  : "configs/global.config.vm" },
           { "level" :  "article",
             "url"  : "configs/global.article.vm" },
           { "level" :  "metrics",
             "url"  : "configs/global.metrics.vm" }
        ];
        // get a list of all files that don't match the excluded list

        configSrc.forEach(function (path, index) {
            var fullPath = repositoryRoot + "/" + path.url;
            if (isValidPath(fullPath, "\\.vm$")) {
                paths.push({"url" : fullPath, "level" : path.level});
            }
        });
        velocityConfigParser();

    };
    velocityConfigFinder();

})(require('fs'), require('walkdir'), require('uglify-js'), require('./lib/reporter'))



