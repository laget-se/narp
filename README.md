# narp ![narp](narp.png)

A workflow utility to ease localization in JS(X) apps by automizing the following steps:

**`narp push`**

1. Extraction of strings from source code ([react-gettext-parser](https://github.com/alexanderwallin/react-gettext-parser))
2. Merging upstream and local translations in order to support translations in branches ([pot-merge](https://github.com/laget-se/pot-merge))
3. Uploading POT resources to Transifex

**`narp pull`**

1. Download PO translations from Transifex
2. Converting PO to JSON ([gettext-parser](https://github.com/andris9/gettext-parser))
3. Writing the JSON translations to where you want it

The JSON translations are formatted for [node-gettext](https://github.com/andris9/node-gettext), so using this as the gettext frameform is a really good idea. :)

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
narp push --password MY_TRANSIFEX_PASS
```

```sh
# download po's + convert to json + write to file
narp pull --password MY_TRANSIFEX_PASS
```

`--password` is also available as `-p`.

```sh
# extract messages to stdout (no password required)
narp extract [./path/to/comps]

Optionally put a path as arg 2 to just extract from the folder.
Protip, pipe to file if you want to use it.
```

### Using the API

```js
import { push, pull } from 'narp';

const configs = {
  transifex: {
    password: 'retrieve this somehow, don\'t check it in'
  },
};

push(configs);

pull(configs);
```

## Configuration in .narprc

`.narprc` is narp's configuration file. There you specify configs for the different tasks that require so.

You only need to specify the configs that you want to overwrite.

The defaults are:

```js
{
  "transifex": {
    "username": null,
    "project": null,
    "resource": null,
    "sourceLang": "en"
  },

  // Configs that are passed to react-gettext-parser
  "extract": {

    // A glob string (npmjs.com/glob) that matches all source files
    // that may contain translatable strings.
    "source": null,

    // These two are passed directly to react-gettext-parser,
    // see the react-gettext-parser readme
    "componentPropsMap": { /* react-gettext-parser defaults */ },
    "funcArgumentsMap": { /* react-gettext-parser defaults */ }
  },

  // Where to put all the translations
  "output": "messages.json"
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
