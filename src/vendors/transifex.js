import got from 'got';
import { po } from 'gettext-parser';

import * as feedback from '../feedback.js';

const API_URL = 'https://www.transifex.com/api/2';

/**
 * Asserts that all necessary credentials are provided.
 */
export const assertCredentials = ({ username, password }) => {
  if (!username || !password) {
    console.log('You need to provide credentials in the form of username and password. [More info]');
    process.exit(0);
  }
};

/**
 * Returns a request headers object
 */
const getHeaders = ({ username, password }) => ({
  Authorization: `Basic ${new Buffer(`${username}:${password}`).toString('base64')}`,
});

/**
 * Fetches all languages for which there are translations to fetch.
 */
const fetchLanguages = ({ project }, { username, password }) => {
  const url = `${API_URL}/project/${project}/languages`;
  const headers = getHeaders({ username, password });

  return got(url, { headers }).then(({ body }) => {
    const langs = JSON.parse(body).map(x => x.language_code);
    return langs;
  });
};

/**
 * Fetches and returns translations for a given project, resource and language.
 */
const fetchTranslationsForLang = ({ project, resource, language }, { username, password }) => {
  const url = `${API_URL}/project/${project}/resource/${resource}/translation/${language}`;
  const headers = getHeaders({ username, password });

  return got.get(url, { headers }).then(({ body }) => {
    // rant(`Got translations for ${lang}`, body.toString());
    return po.parse(JSON.parse(body).content);
  });
};

/**
 * Fetches all translations available and parses them into one big
 * object with locales as keys and gettext-parser PO JSON as values.
 */
export const fetchTranslations = (options, credentials = {}) => {
  const { project, resource, sourceLanguage } = options;

  feedback.step('Fetching available languages from Transifex...');

  return fetchLanguages(options, credentials)
    .then(languages => {
      feedback.step('Fetching translations for all languages...');
      return languages;
    })
    .then(languages => languages.concat(sourceLanguage))
    .then(languages => Promise.all(
      languages.map(language =>
        fetchTranslationsForLang({ project, resource, language }, credentials)
      )
    ))
    .then(translations => translations.reduce((aggr, poJson) => ({
      ...aggr,
      [poJson.headers.language]: poJson,
    }), {}))
    .catch(err => feedback.kill(err));
};

/**
 * Fetches and returns the current source POT.
 */
export const fetchSource = (options, credentials = {}) => {
  const { project, resource } = options;

  const url = `${API_URL}/project/${project}/resource/${resource}/content?file`;
  const headers = getHeaders(credentials);

  return got.get(url, { headers }).then(({ body }) => body);
};

/**
 * Uploads a new POT to be the new source.
 */
export const uploadTranslations = (pot, options, credentials = {}) => {
  const { project, resource } = options;

  const url = `${API_URL}/project/${project}/resource/${resource}/content/`;
  const requestOptions = {
    headers: {
      ...getHeaders(credentials),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content: pot }),
  };

  return got.put(url, requestOptions);
};
