import { getConfig } from './confighelpers';
import { kill } from './feedback.js';
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
  const conf = extend(getConfig(), configs);
  const { project, resource, username, password, sourceLang } = conf.transifex;

  assertPassword(conf);

  // pull trans from transifex
  fetchUrl(`http://www.transifex.com/api/2/project/${project}/languages`, {
    headers: { Authorization: `Basic ${new Buffer(`${username}:${password}`).toString('base64')}` },
  }, (err, meta, body) => {
    if (err) {
      console.log(err);
      process.exit(1);
    }

    if (meta.status >= 400) {
      console.log(meta);
      process.exit(1);
    }

    const data = JSON.parse(body.toString());
    const langs = data.map(x => x.language_code).concat(sourceLang);
    const translations = {};

    langs.forEach(lang => {
      fetchUrl(`http://www.transifex.com/api/2/project/${project}/resource/${resource}/translation/${lang}`, {
        headers: {
          'Authorization': `Basic ${new Buffer(`${username}:${password}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      }, (err, meta, body) => {
        if (err) {
          console.log(err);
          process.exit(1);
        }

        if (meta.status >= 400) {
          console.log(meta);
          process.exit(1);
        }

        // console.log(body.toString());
        translations[lang] = po.parse(JSON.parse(body.toString()).content);
        // console.log(translations[lang]);

        if (Object.keys(translations).length === langs.length) {
          // Make sure the output directory exists
          mkdirp.sync(path.dirname(conf.output));

          fs.writeFileSync(conf.output, JSON.stringify(translations, null, 2));
        }
      });
    });
  });
};

const push = (configs = {}) => {
  // extract strings from source => extract
  const conf = extend(getConfig(), configs);

  assertPassword(conf);

  console.log('Extracting messages from source code...');
  const messages = extractMessagesFromGlob(conf.extract.source);
  const pot = toPot(messages);

  const { project, resource, username, password } = conf.transifex;

  // pull translations from transifex
  console.log('Fetching POT from Transifex...');
  fetchUrl(`http://www.transifex.com/api/2/project/${project}/resource/${resource}/content?file`, {
    headers: { Authorization: `Basic ${new Buffer(`${username}:${password}`).toString('base64')}` },
  }, (err, meta, body) => {
    if (err) {
      kill(err);
    }

    if (meta.status >= 400) {
      console.log(body.toString());
      kill(meta);
    }

    // Merge pots
    console.log('Merging upstream and extracted POT files...');
    const mergedPot = mergePotContents(pot, body.toString('utf-8'));

    // push pots to transifex
    console.log('Uploading new POT to Transifex...');
    fetchUrl(`http://www.transifex.com/api/2/project/${project}/resource/${resource}/content/`, {
      method: 'PUT',
      payload: JSON.stringify({ content: mergedPot }),
      headers: {
        'Authorization': `Basic ${new Buffer(`${username}:${password}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    }, (err, meta, body) => {
      if (err) {
        kill(err);
      }

      if (meta.status >= 400) {
        console.log(body.toString());
        kill(meta);
      }

      console.log('Source file updated and uploaded.');
    });
  });
};

export { pull, push };

