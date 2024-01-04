import cleanLsqStream from './clean.js';
import fs from 'node:fs';
import { Command } from 'commander';

const program = new Command();

program
  .argument('<queries-dest>', 'file path to write queries as N-Triples compressed with gzip')
  .argument('<execs-dest>', 'file path to write executions as N-Triples compressed with gzip')
  .argument('<execs-ns>', 'namespace used to generate execution URIs')
  .option('-s, --source <lsq-source>', 'file path with LSQ source as N-Triples compressed with bzip2, defaults to STDIN')
  .action(async (queriesDest, execsDest, execsNs, options) => {
    const sourceReadStream = 'source' in options ? fs.createReadStream(options.source) : process.stdin;
    const queryWriteStream = fs.createWriteStream(queriesDest);
    const execsWriteStream = fs.createWriteStream(execsDest);
    
    await cleanLsqStream(
      sourceReadStream,
      queryWriteStream,
      execsWriteStream,
      execsNs
    );
    
  });

program.parseAsync().then(() => {
  console.log('Done!');
}, (reason) => {
  console.error(reason);
});;