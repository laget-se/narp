import fs from 'fs';
import path from 'path';
import { GETTEXT_FUNC_ARGS_MAP, GETTEXT_COMPONENT_PROPS_MAP } from 'react-gettext-parser';
import extend from 'deep-extend';

const defaultConfig = {
  vendor: {},
  extract: {
    componentPropsMap: { ...GETTEXT_COMPONENT_PROPS_MAP },
    funcArgumentsMap: { ...GETTEXT_FUNC_ARGS_MAP },
    trim: false,
    trimLines: false,
    trimNewlines: false,
  },
  merge: {},
  fresh: false,
  output: 'messages.json',
};

export const getConfig = () => {
  const fileConfigContent = fs.readFileSync(path.join(process.cwd(), '.narprc'), 'utf-8');
  const configs = extend(defaultConfig, JSON.parse(fileConfigContent));

  if (configs.vendor && configs.vendor.credentials) {
    if (configs.vendor.credentials.password === undefined) {
      configs.vendor.credentials.password = process.env.NARP_VENDOR_PASSWORD;
    }
    if (configs.vendor.credentials.token === undefined) {
      configs.vendor.credentials.token = process.env.NARP_VENDOR_TOKEN;
    }
  }

  return configs;
};
