import { getConfig } from './confighelpers';
import { extractMessagesFromGlob, toPot } from 'react-gettext-parser';
import { fetchUrl } from 'fetch';
import { mergePotContents } from '@lagetse/pot-merge';
import { po } from 'gettext-parser';
import fs from 'fs';

const pull = () => {
  const conf = getConfig();
  const { project, resource, username, password, sourceLang } = conf.transifex;

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

        console.log(body.toString());
        translations[lang] = po.parse(JSON.parse(body.toString()).content);
        console.log(translations[lang]);

        if (Object.keys(translations).length === langs.length) {
          fs.writeFileSync(conf.output, JSON.stringify(translations, null, 2));
        }
      });
    });
  });

  // convert pot to json
  // json to bundle

  console.log('pull pull');
};

const push = () => {
  // extract strings from source => extract
  const conf = getConfig();
  const messages = extractMessagesFromGlob(conf.extract.source);
  const pot = toPot(messages);

  const { project, resource, username, password } = conf.transifex;

  // pull translations from transifex
  fetchUrl(`http://www.transifex.com/api/2/project/${project}/resource/${resource}/content?file`, {
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

    const data = body.toString('utf-8');
    // merge pots
    const output = mergePotContents(pot, data);

    // push pots to transifex
    fetchUrl(`http://www.transifex.com/api/2/project/${project}/resource/${resource}/content/`, {
      method: 'PUT',
      payload: JSON.stringify({ content: output }),
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

      console.log('Source file updated and uploaded.');
    });
  });
};

export { pull, push };

