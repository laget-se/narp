import yargs from 'yargs';
import * as api from './index';

// Adds a password option to the yargs object
const addPasswordOption = yargsObj =>
  yargsObj
    .option('password', {
      alias: 'p',
      type: 'password',
    })
    .demand(['password']);

// Construct the CLI
const args = yargs
  .command('pull', 'Get stuff', addPasswordOption)
  .command('push', 'Push stuff', addPasswordOption)
  .help('help')
  .alias('help', 'h')
  .argv;

const transifexPasswordConfig = {
  transifex: {
    password: args.password,
  },
};

if (args._[0] === 'pull') {
  api.pull(transifexPasswordConfig);
}

if (args._[0] === 'push') {
  api.push(transifexPasswordConfig);
}

