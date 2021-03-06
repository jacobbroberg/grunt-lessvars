import {writeFile, readFile} from 'fs';
import {nfcall, all} from 'q';
import async from 'async';
import merge from 'merge';

import {process} from './lib/extractor';
import formatter from './lib/formatter';

export default grunt => {
    const description = "Parse a set of LESS files, extract variables, and write to a JavaScript file.";

    grunt.registerMultiTask('lessvars', description, function () {
        const done = this.async();
        const files = this.files;
        const options = this.options({
            format: 'json',
            module: 'less',
            constant: 'vars',
            indent: 0,
            units: true,
            rename: name => name
        });

        // read each src/dest pair
        const promises = files.map(file => {
            const dest = file.dest;
            const srcPromises = file.src.map(src =>
                nfcall(readFile, src).then(contents => process(contents, options)).catch(grunt.fatal)
            );

            return all(srcPromises).then(results => ({
                dest: dest,
                data: merge(...results)
            })).catch(grunt.fatal);
        });

        // format output
        const format = typeof options.format === 'function' ? options.format : formatter[options.format];

        // wait for all files to get parsed, then write the results
        all(promises).then(results => {
            async.each(results, (file, next) => {
                writeFile(file.dest, format(file.data, options), next);
            }, done);
        }).catch(grunt.fatal);
    });
};
