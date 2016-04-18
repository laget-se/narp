import { getConfig } from './confighelpers';
import { extractMessagesFromGlob, toPot } from 'react-gettext-parser';
import { fetchUrl } from 'fetch';

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
  // console.log(pot);

  const { project, resource, username, password } = conf.transifex;
  // pull translations from transifex
  fetchUrl(`http://www.transifex.com/api/2/project/${project}/resource/${resource}/content?file`, {
    headers: { Authorization: `Basic ${new Buffer(`${username}:${password}`).toString('base64')}` },
  }, (err, meta, body) => {
    console.log(meta);
    console.log(err);
    console.log(body.toString('utf-8'));
  });

  // merge pots
  // push pots to transifex
  console.log('push push');
};

export { pull, push };

