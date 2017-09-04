import { fetchUrl } from 'fetch';
import { po } from 'gettext-parser';

import * as feedback from '../feedback.js';

const API_URL = 'http://www.transifex.com/api/2';

/**
 * Returns a request headers object
 */
const getHeaders = ({ username, password }) => ({
  Authorization: `Basic ${new Buffer(`${username}:${password}`).toString('base64')}`,
});

/**
 * Fetches all languages for which there are translations to fetch.
 */
const fetchLanguages = ({ project }, { username, password }) =>
  new Promise((resolve, reject) => {
    const url = `${API_URL}/project/${project}/languages`;
    const headers = getHeaders({ username, password });

    fetchUrl(url, { headers }, (err, meta, body) => {
      if (err) {
        reject(err);
        return;
      }

      if (meta.status >= 400) {
        // rant('Request error', body.toString());
        reject(meta);
        return;
      }

      const data = JSON.parse(body.toString());
      const langs = data.map(x => x.language_code);
      resolve(langs);
    });
  });

/**
 * Fetches and returns translations for a given project, resource and language.
 */
const fetchTranslationsForLang = ({ project, resource, language }, { username, password }) => {
  return new Promise((resolve, reject) => {
    const url = `${API_URL}/project/${project}/resource/${resource}/translation/${language}`;
    const headers = getHeaders({ username, password });

    fetchUrl(url, { headers }, (err, meta, body) => {
      if (err) {
        reject(err);
        return;
      }

      if (meta.status >= 400) {
        // rant('Request error', body.toString());
        reject(meta);
        return;
      }

      // rant(`Got translations for ${lang}`, body.toString());
      const poJson = po.parse(JSON.parse(body.toString()).content);
      resolve(poJson);
    });
  });
};

/**
 * Fetches all translations available and parses them into one big
 * object with locales as keys and gettext-parser PO JSON as values.
 */
export const fetchTranslations = (options, credentials = {}) => {
  const { project, resource, sourceLang } = options;

  feedback.step('Fetching available languages from Transifex...');

  return fetchLanguages(options, credentials)
    .then(languages => {
      feedback.step('Fetching translations for all languages...');
      return languages;
    })
    .then(languages => languages.concat(sourceLang))
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
export const fetchSource = (options, credentials = {}) =>
  new Promise((resolve, reject) => {
    const { project, resource } = options;

    const url = `${API_URL}/project/${project}/resource/${resource}/content?file`;
    const headers = getHeaders(credentials);

    fetchUrl(url, { headers }, (err, meta, body) => {
      if (err) {
        reject(err);
        return;
      }

      if (meta.status >= 400) {
        // rant('Request error', body.toString());
        reject(meta);
        return;
      }

      resolve(body.toString('utf-8'));
    });
  });

/**
 * Uploads a new POT to be the new source.
 */
export const uploadTranslations = (pot, options, credentials = {}) =>
  new Promise((resolve, reject) => {
    const { project, resource } = options;

    const url = `${API_URL}/project/${project}/resource/${resource}/content/`;
    const requestOptions = {
      method: 'PUT',
      payload: JSON.stringify({ content: pot }),
      headers: {
        ...getHeaders(credentials),
        'Content-Type': 'application/json',
      },
    };

    fetchUrl(url, requestOptions, (err, meta) => {
      if (err) {
        reject(err);
        return;
      }

      if (meta.status >= 400) {
        // rant('Request error', body.toString());
        reject(meta);
        return;
      }

      resolve();
    });
  });
