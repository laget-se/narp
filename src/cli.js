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



const askForPassword = (fn) => {
  read({ prompt: 'Password: ', silent: true }, (er, password) => {

    const options = {
      transifex: {
        password: password,
      },
      verbose: args.verbose,
    };

    fn(options);
  })
}

if (args._[0] === 'pull') {
  askForPassword(options => {
    api.pull(options);
  });
}

if (args._[0] === 'push') {
  askForPassword(options => {
    api.push(options);
  });
}
