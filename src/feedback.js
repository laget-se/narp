
export const kill = (...args) => {
  console.log('\n\nKilling due to error:\n');
  console.log.apply(console, args);
  process.exit(1);
};
