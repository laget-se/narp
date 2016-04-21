import yargs from 'yargs';
import * as api from './index';

// Adds a password option to the yargs object
const sharedOptions = yargsObj =>
  yargsObj
    .option('password', {
      alias: 'p',
      type: 'password',
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'More verbose output',
    })
    .demand(['password']);

// Construct the CLI
const args = yargs
  .command('pull', 'Get stuff', sharedOptions)
  .command('push', 'Push stuff', sharedOptions)
  .help('help')
  .alias('help', 'h')
  .argv;

const options = {
  transifex: {
    password: args.password,
  },
  verbose: args.verbose,
};

if (args._[0] === 'pull') {
  api.pull(options);
}

if (args._[0] === 'push') {
  api.push(options);
}

