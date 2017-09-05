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
import * as poeditor from './vendors/poeditor.js';

const assertVendor = vendorName => {
  if ([Vendors.TRANSIFEX, Vendors.POEDITOR].indexOf(vendorName) === -1) {
    console.log(
      `A vendor with name ${vendorName} is not supported. ` +
      `You can currently choose between "${Vendors.TRANSIFEX}" and "${Vendors.POEDITOR}".`
    );
    process.exit(0);
  }
};

const getVendor = vendorName => {
  if (vendorName === Vendors.TRANSIFEX) {
    return transifex;
  }
  else if (vendorName === Vendors.POEDITOR) {
    return poeditor;
  }

  return null;
};

/**
 * Fetches all translations available through the configurated
 * vendor and writes the whole parsed shebang to the configurated
 * output path.
 */
const pull = (configs = {}) => {
  const conf = extend(getConfig(), configs);

  feedback.setVerbose(conf.verbose);
  feedback.begin('pull');

  const { name, credentials, options } = conf.vendor;

  assertVendor(name);

  const vendor = getVendor(name);
  vendor.assertCredentials(credentials);

  // Fetch translations
  return vendor.fetchTranslations(options, credentials).then(translations => {
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
  const conf = extend(getConfig(), configs);

  feedback.setVerbose(conf.verbose);
  feedback.begin('push');

  const { name, credentials, options } = conf.vendor;

  assertVendor(name);

  const vendor = getVendor(name);
  vendor.assertCredentials(credentials);

  feedback.step('Extracting messages from source code...');
  const messages = extractMessagesFromGlob(conf.extract.source);
  const pot = toPot(messages);
  feedback.rant('Extracted pot:', pot);

  feedback.step('Fetching upstream POT source...');

  return vendor.fetchSource(options, credentials)
    .then(sourcePot => {
      feedback.rant('...got POT source:', sourcePot);
      feedback.step('Merging upstream and extracted POT files...');
      return sourcePot.trim().length > 0
        ? mergePotContents(sourcePot, pot)
        : pot;
    })
    .then(mergedPot => {
      feedback.rant('...merged POT into:', mergedPot);
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
  const conf = extend(getConfig(), configs);

  feedback.setVerbose(true);
  feedback.begin('extraction');

  // extract strings from source => extract
  const source = inputSource.length > 0
                 ? [`${inputSource}/**/\{*.js,*.jsx\}`]
                 : conf.extract.source;

  feedback.step('Extracting messages from source code...');
  const messages = extractMessagesFromGlob(source);

  messages.forEach(msg => {
    const { reference } = msg.comments;
    const refs = reference.map(r => inputSource.length ? r.replace(inputSource, '') : r);
    feedback.rant(`${refs.join(', ')} -> ${msg.msgid}`);
  });

  feedback.finish('Extracted all messages for you.');
};

export { pull, push, extract };
