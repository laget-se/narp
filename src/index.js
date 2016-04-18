import { getConfig } from './confighelpers';
import { extractMessagesFromGlob, toPot } from 'react-gettext-parser';
import { fetchUrl } from 'fetch';
import { mergePotContents } from '@lagetse/pot-merge';

const pull = () => {
  // pull trans from transifex
  // convert pot to json
  // json to bundle
  const conf = getConfig();

  console.log(conf);
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

