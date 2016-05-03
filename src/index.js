import { getConfig } from './confighelpers';
import * as feedback from './feedback.js';
import { extractMessagesFromGlob, toPot } from 'react-gettext-parser';
import { fetchUrl } from 'fetch';
import { mergePotContents } from '@lagetse/pot-merge';
import { po } from 'gettext-parser';
import fs from 'fs';
import path from 'path';
import extend from 'deep-extend';
import mkdirp from 'mkdirp';

const assertPassword = config => {
  if (!config.transifex.password) {
    console.log('You need to provide a Transifex password using --password MYPASS');
    process.exit(0);
  }
};

const pull = (configs = {}) => {
  feedback.begin('pull');

  const conf = extend(getConfig(), configs);
  const { project, resource, username, password, sourceLang } = conf.transifex;

  assertPassword(conf);

  const rant = feedback.ranter(conf.verbose);

  feedback.step('Fetching available languages from Transifex...');

  // pull trans from transifex
  fetchUrl(`http://www.transifex.com/api/2/project/${project}/languages`, {
    headers: { Authorization: `Basic ${new Buffer(`${username}:${password}`).toString('base64')}` },
  }, (err, meta, body) => {
    if (err) {
      feedback.kill(err);
    }

    if (meta.status >= 400) {
      rant('Request error', body.toString());
      feedback.kill(meta);
    }

    const data = JSON.parse(body.toString());
    const langs = data.map(x => x.language_code).concat(sourceLang);
    const translations = {};

    rant('Got languages:', langs);

    feedback.step('Fetching translations for all languages...');

    langs.forEach(lang => {
      fetchUrl(`http://www.transifex.com/api/2/project/${project}/resource/${resource}/translation/${lang}`, {
        headers: {
          'Authorization': `Basic ${new Buffer(`${username}:${password}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      }, (err, meta, body) => {
        if (err) {
          feedback.kill(err);
        }

        if (meta.status >= 400) {
          rant('Request error', body.toString());
          feedback.kill(meta);
        }

        rant(`Got translations for ${lang}`, body.toString());
        translations[lang] = po.parse(JSON.parse(body.toString()).content);

        if (Object.keys(translations).length === langs.length) {
          feedback.step('Writing all translations to', path.resolve(conf.output));

          // Make sure the output directory exists
          mkdirp.sync(path.dirname(conf.output));

          fs.writeFileSync(conf.output, JSON.stringify(translations, null, 2));

          feedback.finish('Translations pulled.');
        }
      });
    });
  });
};

const push = (configs = {}) => {
  feedback.begin('push');

  // extract strings from source => extract
  const conf = extend(getConfig(), configs);

  assertPassword(conf);

  const rant = feedback.ranter(conf.verbose);

  feedback.step('Extracting messages from source code...');
  const messages = extractMessagesFromGlob(conf.extract.source);
  const pot = toPot(messages);
  rant('extracted pot:', pot);

  const { project, resource, username, password } = conf.transifex;

  // pull translations from transifex
  feedback.step('Fetching POT from Transifex...');
  fetchUrl(`http://www.transifex.com/api/2/project/${project}/resource/${resource}/content?file`, {
    headers: { Authorization: `Basic ${new Buffer(`${username}:${password}`).toString('base64')}` },
  }, (err, meta, body) => {
    if (err) {
      feedback.kill(err);
    }

    if (meta.status >= 400) {
      console.log(body.toString());
      feedback.kill(meta);
    }

    rant('...got pot from transifex:\n', body.toString());

    // Merge pots
    feedback.step('Merging upstream and extracted POT files...');
    const mergedPot = mergePotContents(body.toString('utf-8'), pot);
    rant('...merged pot:\n', mergedPot);

    // push pots to transifex
    feedback.step('Uploading new POT to Transifex...');
    fetchUrl(`http://www.transifex.com/api/2/project/${project}/resource/${resource}/content/`, {
      method: 'PUT',
      payload: JSON.stringify({ content: mergedPot }),
      headers: {
        'Authorization': `Basic ${new Buffer(`${username}:${password}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    }, (err, meta, body) => {
      if (err) {
        feedback.kill(err);
      }

      if (meta.status >= 400) {
        console.log(body.toString());
        feedback.kill(meta);
      }

      feedback.finish('Source file updated and uploaded.');
    });
  });
};

export { pull, push };
