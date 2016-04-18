import fs from 'fs';
import path from 'path';
import { GETTEXT_FUNC_ARGS_MAP, GETTEXT_COMPONENT_PROPS_MAP } from 'react-gettext-parser';
import extend from 'deep-extend';

const config = {
  transifex: {
    sourceLang: 'en',
  },
  extract: {
    componentPropsMap: GETTEXT_COMPONENT_PROPS_MAP,
    funcArgumentsMap: GETTEXT_FUNC_ARGS_MAP,
  },
  merge: {},
  output: 'messages.json',
};

export const getConfig = () => {
  const content = fs.readFileSync(path.join(process.cwd(), '.narprc'), 'utf-8');
  return extend(config, JSON.parse(content));
};
