import cleanLsqStream from './clean.js';
import fs from 'node:fs';
import { Command } from 'commander';

const program = new Command();

function addExtension(filepath, ext) {
  return filepath + (filepath.endsWith(ext) ? '' : ext);
}

function getWriteStream(options, param, ext) {
  return param in options ? fs.createWriteStream(addExtension(options[param], ext)) : null;
}

const OUTPUT_STREAMS_EXTENSIONS = {
  'queriesCsv': '.csv',
  'execsCsv': '.csv',
  'queriesRdf': '.nt.gz',
  'execsRdf': '.nt.gz'
}

program
  .argument('<execs-ns>', 'namespace used to generate execution URIs')
  .option('-s, --source <lsq-source>', 'file path with LSQ source as N-Triples compressed with bzip2, defaults to STDIN')
  .option('-q, --queries-csv <queries-csv-dest>', 'file path to write queries as CSV')
  .option('-e, --execs-csv <execs-csv-dest>', 'file path to write executions as CSV')
  .option('-u, --queries-rdf <queries-rdf-dest>', 'file path to write queries as N-Triples compressed with gzip')
  .option('-x, --execs-rdf <execs-rdf-dest>', 'file path to write executions as N-Triples compressed with gzip')
  .action(async (execsNs, options) => {
    const sourceReadStream = 'source' in options ? fs.createReadStream(options.source) : process.stdin;
    const outputStreams = Object.fromEntries(
      Object.keys(options)
      .filter(key => key in OUTPUT_STREAMS_EXTENSIONS)
      .map(dest => [dest, fs.createWriteStream(addExtension(options[dest], OUTPUT_STREAMS_EXTENSIONS[dest]))]));
        
    await cleanLsqStream(
      sourceReadStream, execsNs,
      outputStreams
    );
    
  });

program.parseAsync().then(() => {
  console.log('Done!');
}, (reason) => {
  console.error(reason);
});;