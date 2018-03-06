# narp ![narp](narp.png)

A workflow utility to ease localization in JS(X) apps by automizing the following steps:

**`narp push`**

1. Extraction of strings from source code ([react-gettext-parser](https://github.com/alexanderwallin/react-gettext-parser))
2. Merging upstream and local translations in order to support translations in branches ([pot-merge](https://github.com/laget-se/pot-merge))
3. Uploading POT resources to the translation service you use (Transifex or POEditor)

**`narp pull`**

1. Download PO translations from the translation service
2. Converting PO to JSON ([gettext-parser](https://github.com/andris9/gettext-parser))
3. Writing the JSON translations to where you want it

The JSON translations are formatted for [node-gettext](https://github.com/andris9/node-gettext).

<details>
<summary><strong>Table of Contents</strong></summary>
  
* [Installation](#installation)
* [Usage](#usage)
  * [Using the CLI](#using-the-cli)
  * [Using the API](#using-the-api)
* [Configuration](#configuration)
  * [Options](#options)
  * [How to provide credentials](#how-to-provide-credentials)
    * [Authorizing to Transifex](#authorizing-to-transifex)
    * [Authorizing to POEditor](#authorizing-to-poeditor)
  * [.narprc](#narprc)
* [Migrations](#migrations)
  * [Migrating from v2 to v3](#migrating-from-v2-to-v3)
* [Development](#development)
  * [Creating builds](#creating-builds)
  * [Making it globally available while testing](#making-it-globally-available-while-testing)
  * [Releases](#releases)

</details>


## Installation

To use it easily, install narp globally with:

```sh
npm install -g narp
```

To use it in an automatization pipeline in your project, install it as a dev dependency:

```sh
npm install --save-dev narp
```

## Usage

### Using the CLI

```sh
# get help
narp -h
```

```sh
# extract + merge pots + upload pot
narp push [<credentials>]
```

```sh
# download po's + convert to json + write to file
narp pull [<credentials>]
```

```sh
# extract messages to stdout (no password required)
narp extract [./path/to/comps]
```

Optionally put a path as arg 2 to just extract from the folder.
Protip, pipe to file if you want to use it.

### Using the API

```js
import { push, pull } from 'narp';

const configs = {
  /* all the configs */
};

push(configs).then(/* ... */).catch(/* ... */);

pull(configs).then(/* ... */).catch(/* ... */);
```

## Configuration

### Options

This is the shape of narp's configuration. It can be provided as an object to the `pull()` and `push()` functions, or defined as a JSON object in `.narprc`.

```js
{
  // The vendor object differs depending on the vendor
  "vendor": {
    
    // The name of the translation service you use.
    // Must be "transifex" or "poeditor"
    "name": "pick one"

    // Credentials used to make authorized HTTP requests.
    // See the section below on how to provide passwords
    // and tokens.
    "credentials": {

      // Transifex needs a username and password
      "username": "my-tfx-username",
      "password": "do not store this in a file",

      // POEditor needs a token
      "token": "do not store this in a file"
    },

    // The vendor.options object contain project specific
    // options, some of which differ depending on the vendor
    "options": {

      // Project ID.
      "project": "project-id",

      // The source language code. This corresponds to whatever
      // the vendor is naming it as.
      "sourceLanguage": "en",
      
      // Transifex only: The slug of the resource
      "resource": null,
    }
  },

  // Configs that are passed to react-gettext-parser
  "extract": {

    // A glob string (npmjs.com/glob) that matches all source files
    // that may contain translatable strings.
    "source": null,

    // The rest of the `extract` configs are passed directly to
    // react-gettext-parser, see the react-gettext-parser readme.
    "componentPropsMap": { /* react-gettext-parser defaults */ },
    "funcArgumentsMap": { /* react-gettext-parser defaults */ },
    "trim": false,
    "trimLines": false,
    "trimNewlines": false,
  },

  // Where to put all the translations
  "output": "messages.json",

  // If true, will output debug information to the console
  "verbose": false
}
```


### How to provide credentials

You will have to provide different credentials depending on the translation service you use. Transifex requires a username and password, whilst POEditor requires an API token.

#### Authorizing to Transifex

First, provide the Transifex username via the `vendor.credentials.username` config (see the config shape section). Then, there are three ways you can provide a password:

a. Via the `---password` argument
b. Via the `NARP_VENDOR_PASSWORD` environment variable
c. Via the `vendor.credentials.password` config passed to the API functions

*Never store passwords in your code!*

#### Authorizing to POEditor

There are three ways of providing an API token:

a. Via the `--token` argument
b. Via the `NARP_VENDOR_TOKEN` environment variable
c. Via the `vendor.credentials.token` config passed to the API functions

*Never store secret tokens in your code!*

### .narprc

`.narprc` is narp's configuration file. Any configurations you put there will be parsed and applied whenever you use narp. 


## Migrations

### Migrating from v2 to v3

v3 introduced vendors, which replaces the hard-coded Transifex support with a modularised vendor support, adding POEditor into the mix. To transition your Transifex configuration, you change `.narprc` from

```js
{
  "transifex": {
    "username": "yourusername",
    "project": "yourproject",
    "resource": "yourresource",
    "sourceLang": "xx"
  },
  // More configs...
}
```

to

```js
{
  "vendor": {
    "name": "transifex",
    "credentials": {
      "username": "yourusername"
    },
    "options": {
      "project": "yourproject",
      "resource": "yourresource",
      "sourceLanguage": "xx" // Note that this key is different
    }
  },
  // More configs...
}
```


## Development

### Creating builds

```sh
# Create a build from source
npm run build

# Build continuously as you save files
npm run build -- --watch
```

### Making it globally available while testing

```sh
cd path/to/narp && npm link
```

### Releases

Follow semver when bumping the version number, commit it and run

```sh
npm publish
```
