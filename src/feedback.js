
import colors from 'colors';

export const begin = (...messages) => {
  console.log('\n- - - - - - - -');
  messages.forEach(msg => console.log(`  ${msg.underline}`));
  console.log('- - - - - - - -\n');
};

export const step = (...messages) => {
  messages.forEach(msg => console.log(msg.yellow));
};

export const ranter = (verbose) => {
  if (verbose) {
    return (...things) => {
      things.forEach(thing => console.log(`${thing}`.gray));
    };
  }

  return () => {};
};

export const finish = (...messages) => {
  messages.forEach(msg => console.log(msg.bold.green));
};

export const kill = (...args) => {
  console.log('\n\nKilling due to error:\n'.red);
  console.log.apply(console, args);
  process.exit(1);
};
