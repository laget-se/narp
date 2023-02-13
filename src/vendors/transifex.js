import got from 'got';
import { po } from 'gettext-parser';

import * as feedback from '../feedback.js';

const API_URL = 'https://rest.api.transifex.com';

const sleep = (time) => new Promise((resolve) => {
  setTimeout(resolve, time);
});

/**
 * Asserts that all necessary credentials are provided.
 */
export const assertCredentials = ({ token }) => {
  if (!token) {
    console.log(
      `You need to provide a Transifex API token by either:

      * passing a vendor.credentials.token option in the function call;
      * providing a --token argument to the CLI; or
      * setting a NARP_VENDOR_TOKEN environment variable

See https://github.com/laget-se/narp#readme for more info.`
    );
    process.exit(0);
  }
};

/**
 * Returns a request headers object
 */
const getHeaders = ({ token }) => ({
  'Authorization': `Bearer ${token}`,
  'Accept': 'application/vnd.api+json',
  'Content-Type': 'application/vnd.api+json',
});

/**
 * Fetches all languages for which there are translations to fetch.
 */
const fetchLanguages = ({ organization, project }, { token }) => {
  const projectParam = `o:${organization}:p:${project}`;
  const url = `${API_URL}/projects/${encodeURIComponent(projectParam)}/languages`;

  const headers = getHeaders({ token });

  return got(url, { headers }).then(({ body }) => JSON.parse(body).data.map(x => x.attributes.code));
};

/**
 * Fetches and returns translation when done file is ready to be downloaded.
 */
const awaitTranslationDownload = async (url, headers) => {
  const statusResponse = await got.get(url, {
    headers,
    followRedirect: false,
  });

  // Transifex has always been to quick to create the download file so this has not been properly tested.
  if (statusResponse.statusCode === 200) {
    const { data } = JSON.parse(statusResponse.body);
    const stillPreparingDownload = ['pending', 'processing'].includes(data.attributes.status);

    if (stillPreparingDownload) {
      // eslint-disable-next-line no-unused-expressions
      await sleep(3000);
      return awaitTranslationDownload(url, headers, false);
    }
  }

  if (statusResponse.statusCode === 303) {
    const downloadResponse = await got.get(statusResponse.requestUrl, {
      headers,
    });

    return downloadResponse.body;
  }

  throw new Error('Response Not Handeled');
};

/**
 * Initiate async translatino download
 */
const initiateAsyncTranslationDownload = async ({ organization, project, resource, language }, { token }) => {
  const url = `${API_URL}/resource_translations_async_downloads`;
  const headers = getHeaders({ token });

  const body = {
    data: {
      attributes: {
        callback_url: null,
        content_encoding: 'text',
        file_type: 'default',
        mode: 'default',
        pseudo: false,
      },
      relationships: {
        language: {
          data: {
            type: 'languages',
            id: `l:${language}`,
          },
        },
        resource: {
          data: {
            type: 'resources',
            id: `o:${organization}:p:${project}:r:${resource}`,
          },
        },
      },
      type: 'resource_translations_async_downloads',
    },
  };

  const response = await got.post(url, {
    headers,
    body: JSON.stringify(body),
  });

  return JSON.parse(response.body).data.links.self;
};

/**
 * Fetches all translations available and parses them into one big
 * object with locales as keys and gettext-parser PO JSON as values.
 */
export const fetchTranslations = (options, credentials = {}) => {
  const { organization, project, resource } = options;
  const headers = getHeaders(credentials);

  feedback.step('Fetching available languages from Transifex...');

  return fetchLanguages(options, credentials)
    .then(languages => {
      feedback.step(`Fetching translations for languages: ${languages} ...`);
      return languages;
    })
    .then(languages => Promise.all(
      languages.map(language =>
        initiateAsyncTranslationDownload({ organization, project, resource, language }, credentials)
      )
    ))
    .then(translationDownloadUrls => Promise.all(
      translationDownloadUrls.map(translationDownloadUrl =>
        awaitTranslationDownload(translationDownloadUrl, headers)
      )
    ))
    .then(messagespotFiles => messagespotFiles.map(messagespotFile => po.parse(messagespotFile)))
    .then(translations => translations.reduce((aggr, poJson) => ({
      ...aggr,
      [poJson.headers.language]: poJson,
    }), {}))
    .catch(err => feedback.kill(err));
};

/**
 * Fetches and returns the current source POT.
 */
export const fetchSource = async (options, credentials = {}) => {
  const { organization, project, resource } = options;

  const url = `${API_URL}/resource_strings_async_downloads`;
  const headers = getHeaders(credentials);
  const body = {
    data: {
      attributes: {
        callback_url: null,
        content_encoding: 'text',
        file_type: 'default',
        pseudo: false,
      },
      relationships: {
        resource: {
          data: {
            type: 'resources',
            id: `o:${organization}:p:${project}:r:${resource}`,
          },
        },
      },
      type: 'resource_strings_async_downloads',
    },
  };

  const response = await got.post(url, {
    headers,
    body: JSON.stringify(body),
  });

  const downloadURL = JSON.parse(response.body).data.links.self;

  return awaitTranslationDownload(downloadURL, headers);
};

/**
 * Return translation upload status when upload is done.
 */
const awaitTranslationUpload = async (url, credentials) => {
  const headers = getHeaders(credentials);
  const response = await got.get(url, { headers });
  const status = JSON.parse(response.body).data.attributes.status;

  if (['pending', 'processing'].includes(status)) {
    // eslint-disable-next-line no-unused-expressions
    await sleep(3000);
    return await awaitTranslationUpload(url, credentials);
  }

  return status;
};

/**
 * Uploads a new POT to be the new source.
 */
export const uploadTranslations = async (pot, options, credentials = {}) => {
  const { organization, project, resource } = options;

  const url = `${API_URL}/resource_strings_async_uploads`;
  const body = {
    data: {
      attributes: {
        callback_url: null,
        replace_edited_strings: false,
        content: pot,
      },
      relationships: {
        resource: {
          data: {
            type: 'resources',
            id: `o:${organization}:p:${project}:r:${resource}`,
          },
        },
      },
      type: 'resource_strings_async_uploads',
    },
  };

  const requestOptions = {
    headers: getHeaders(credentials),
    body: JSON.stringify(body),
  };

  const response = await got.post(url, requestOptions);
  const { data } = JSON.parse(response.body);

  let status = data.attributes.status;
  if (['pending', 'processing'].includes(status)) {
    status = await awaitTranslationUpload();
  }

  if (data.attributes.status === 'failed') {
    feedback.kill('Failed to upload POT file');
  }
  else if (data.attributes.status !== 'succeeded') {
    throw new Error('Unexpected Upload Status');
  }
};
