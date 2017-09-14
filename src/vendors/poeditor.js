import { po } from 'gettext-parser';
import got from 'got';
import qs from 'qs';
import FormData from 'form-data';
import stringToStream from 'string-to-stream';

import * as feedback from '../feedback.js';

const API_URL = 'https://api.poeditor.com/v2';

/**
 * Asserts that all necessary credentials are provided.
 */
export const assertCredentials = ({ token }) => {
  if (!token) {
    console.log(
      `You need to provide a POEditor API token by either:

      * passing a vendor.credentials.token option in the function call;
      * providing a --token argument to the CLI; or
      * setting a NARP_VENDOR_TOKEN environment variable

See https://github.com/laget-se/narp#readme for more info.`
    );
    process.exit(0);
  }
};

/**
 * Fetches all languages for which there are translations to fetch.
 */
const fetchLanguages = ({ project }, { token }) => {
  const options = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: qs.stringify({
      api_token: token,
      id: project,
    }),
  };

  return got(`${API_URL}/languages/list`, options).then(({ body }) => {
    const { response, result } = JSON.parse(body);
    return response.status === 'success'
      ? result.languages.map(x => x.code)
      : [];
  });
};

/**
 * Fetches and returns a URL to a PO resource for a given
 * project and language.
 */
const fetchPoUrl = ({ project, language }, { token }) =>
  got.post(`${API_URL}/projects/export`, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: qs.stringify({
      api_token: token,
      id: project,
      language,
      type: 'po',
    }),
  })
    .then(res => {
      const { response, result } = JSON.parse(res.body);
      return response.status === 'success'
        ? result.url
        : null;
    });

/**
 * Fetches and returns translations for a given project and language.
 */
const fetchTranslationsForLang = ({ project, language }, { token }) =>
  fetchPoUrl({ project, language }, { token })
    .then(poUrl => (poUrl ? got.get(poUrl).then(results => results.body) : ''))
    .then(potContents => {
      feedback.rant(`Got translations for ${language}`, potContents);
      return po.parse(potContents);
    });

/**
 * Fetches all translations available and parses them into one big
 * object with locales as keys and gettext-parser PO JSON as values.
 */
export const fetchTranslations = (options, credentials = {}) => {
  const { project } = options;

  feedback.step('Fetching available languages from POEditor...');

  return fetchLanguages({ project }, credentials)
    .then(languages => {
      feedback.step(`Fetching translations for languages: ${languages} ...`);
      return languages;
    })
    .then(languages => Promise.all(
      languages.map(language =>
        fetchTranslationsForLang({ project, language }, credentials)
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
  const { project, sourceLanguage } = options;

  return fetchPoUrl({ project, language: sourceLanguage }, credentials)
    .then(poUrl => (poUrl ? got.get(poUrl).then(res => res.body) : ''));
};

/**
 * Uploads a new POT to be the new source.
 */
export const uploadTranslations = (pot, options, credentials = {}) => {
  const { project, sourceLanguage } = options;

  const potStream = stringToStream(pot);

  // Prevent the POEditor API from complaining about file extension
  potStream.path = `${project}.pot`;

  const form = new FormData();
  form.append('api_token', credentials.token);
  form.append('id', project);
  form.append('updating', 'terms_translations');
  form.append('language', sourceLanguage);
  form.append('file', potStream);
  form.append('sync_terms', '1');

  const url = `${API_URL}/projects/upload`;
  const requestOptions = {
    headers: form.getHeaders(),
    body: form,
  };

  return got.post(url, requestOptions);
};
