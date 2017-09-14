import colors from 'colors';

let isVerbose = false;

export const setVerbose = (verbose) => {
  isVerbose = verbose;
};

export const begin = (...messages) => {
  console.log('\n- - - - - - - -');
  messages.forEach(msg => console.log(`  ${msg.underline}`));
  console.log('- - - - - - - -\n');
};

export const step = (...messages) => {
  messages.forEach(msg => console.log(msg.yellow));
};

export const rant = (...messages) => {
  if (isVerbose === true) {
    messages.forEach(msg => console.log(msg.gray));
  }
};

export const finish = (...messages) => {
  messages.forEach(msg => console.log(msg.bold.green));
};

export const kill = (...args) => {
  console.log('\n\nKilling due to error:\n'.red);
  console.log.apply(console, args);
  process.exit(1);
};
