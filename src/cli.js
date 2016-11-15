import yargs from 'yargs';
import read from 'read';
import * as api from './index';

// Adds a password option to the yargs object
const sharedOptions = yargsObj =>
  yargsObj
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'More verbose output',
    });

// Construct the CLI
const args = yargs
  .command('pull', 'Get stuff', sharedOptions)
  .command('push', 'Push stuff', sharedOptions)
  .help('help')
  .alias('help', 'h')
  .argv;


const buildOptions = (password, verbose) =>
  ({
    transifex: {
      password,
    },
    verbose,
  });

const askForPassword = (fn) => {
  read({ prompt: 'Password: ', silent: true }, (er, password) => {
    const options = buildOptions(password, args.verbose);
    fn(options);
  });
};

if (args._[0] === 'pull') {
  if (!args.password) {
    askForPassword(options => {
      api.pull(options);
    });
  }
  else {
    api.pull(buildOptions(args.password, args.verbose));
  }
}

if (args._[0] === 'push') {
  if (!args.password) {
    askForPassword(options => {
      api.push(options);
    });
  }
  else {
    api.push(buildOptions(args.password, args.verbose));
  }
}
