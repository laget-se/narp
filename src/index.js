import { extractMessagesFromGlob, toPot } from 'react-gettext-parser';
import { mergePotContents } from 'pot-merge';
import fs from 'fs';
import path from 'path';
import extend from 'deep-extend';
import mkdirp from 'mkdirp';

import { getConfig } from './confighelpers';
import { Vendors } from './constants.js';
import * as feedback from './feedback.js';
import * as transifex from './vendors/transifex.js';
// import poeditor from './vendors/poeditor.js';

const assertVendor = vendorName => {
  if ([Vendors.TRANSIFEX, Vendors.POEDITOR].indexOf(vendorName) === -1) {
    console.log(
      `A vendor with name ${vendorName} is not supported. ` +
      `You can currently choose between "${Vendors.TRANSIFEX}" and "${Vendors.POEDITOR}".`
    );
    process.exit(0);
  }
};

const assertCredentials = ({ username, password }) => {
  if (!username || !password) {
    console.log('You need to provide credentials in the form of username and password. [More info]');
    process.exit(0);
  }
};

const getVendor = vendorName => {
  if (vendorName === Vendors.TRANSIFEX) {
    return transifex;
  }
  // else if (vendorName === Vendors.POEDITOR) {
  //   return poeditor;
  // }

  return null;
};

/**
 * Fetches all translations available through the configurated
 * vendor and writes the whole parsed shebang to the configurated
 * output path.
 */
const pull = (configs = {}) => {
  feedback.begin('pull');

  const conf = extend(getConfig(), configs);
  const { name, credentials, options } = conf.vendor;

  assertVendor(name);
  assertCredentials(credentials);

  // const rant = feedback.ranter(conf.verbose);
  const vendor = getVendor(name);

  // Fetch translations
  vendor.fetchTranslations(options, credentials).then(translations => {
    feedback.step('Writing all translations to', path.resolve(conf.output));

    // Make sure the output directory exists
    mkdirp.sync(path.dirname(conf.output));

    // Write the JSON translations file
    fs.writeFileSync(conf.output, JSON.stringify(translations, null, 2));

    feedback.finish('Translations pulled.');
  });
};

/**
 * Extracts translatable strings from the source code, merges them
 * with the upstream source and uploads the result to the configurated
 * vendor.
 */
const push = (configs = {}) => {
  feedback.begin('push');

  const conf = extend(getConfig(), configs);
  const { name, credentials, options } = conf.vendor;

  assertVendor(name);
  assertCredentials(credentials);

  // const rant = feedback.ranter(conf.verbose);
  const vendor = getVendor(name);

  feedback.step('Extracting messages from source code...');
  const messages = extractMessagesFromGlob(conf.extract.source);
  const pot = toPot(messages);
  // rant('extracted pot:', pot);

  feedback.step('Fetching POT from Transifex...');

  vendor.fetchSource(options, credentials)
    .then(sourcePot => {
      // Merge pots
      feedback.step('Merging upstream and extracted POT files...');
      return mergePotContents(sourcePot, pot);
    })
    .then(mergedPot => {
      feedback.step('Uploading new POT...');
      return vendor.uploadTranslations(mergedPot, options, credentials);
    })
    .then(() => feedback.finish('Source file updated and uploaded.'))
    .catch(err => feedback.kill(err));
};

/**
 * Extracts translatable strings from the source code and outputs
 * them to the console.
 */
const extract = (configs = {}, inputSource = '') => {
  feedback.begin('extraction');

  // extract strings from source => extract
  const conf = extend(getConfig(), configs);
  const rant = feedback.ranter(true);
  const source = inputSource.length > 0
                 ? [`${inputSource}/**/\{*.js,*.jsx\}`]
                 : conf.extract.source;

  feedback.step('Extracting messages from source code...');
  const messages = extractMessagesFromGlob(source);

  messages.forEach(msg => {
    const { reference } = msg.comments;
    const refs = reference.map(r => inputSource.length ? r.replace(inputSource, '') : r);
    rant(`${refs.join(', ')} -> ${msg.msgid}`);
  });

  feedback.finish('Extracted all messages for you.');
};

export { pull, push, extract };
