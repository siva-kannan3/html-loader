import { getOptions } from 'loader-utils';
import validateOptions from 'schema-utils';

import { sourcePlugin, minimizerPlugin } from './plugins';

import {
  pluginRunner,
  isProductionMode,
  getImportCode,
  getModuleCode,
  getExportCode,
} from './utils';

import schema from './options.json';

export default async function htmlLoader(content) {
  const options = getOptions(this);

  validateOptions(schema, options, {
    name: 'HTML Loader',
    baseDataPath: 'options',
  });

  if (options.preprocessor) {
    // eslint-disable-next-line no-param-reassign
    content = await options.preprocessor(content, this);
  }

  const plugins = [];

  const attributes =
    typeof options.attributes === 'undefined' ? true : options.attributes;

  if (attributes) {
    plugins.push(sourcePlugin({ attributes, resourcePath: this.resourcePath }));
  }

  const minimize =
    typeof options.minimize === 'undefined'
      ? isProductionMode(this)
      : options.minimize;

  if (minimize) {
    plugins.push(minimizerPlugin({ minimize }));
  }

  const { html, messages } = pluginRunner(plugins).process(content);

  const errors = [];
  const imports = [];
  const replacements = [];

  for (const message of messages) {
    // eslint-disable-next-line default-case
    switch (message.type) {
      case 'error':
        errors.push(message.value);
        break;
      case 'import':
        imports.push(message.value);
        break;
      case 'replacement':
        replacements.push(message.value);
        break;
    }
  }

  for (const error of errors) {
    this.emitError(error instanceof Error ? error : new Error(error));
  }

  const codeOptions = { ...options, loaderContext: this };
  const importCode = getImportCode(html, imports, codeOptions);
  const moduleCode = getModuleCode(html, replacements, codeOptions);
  const exportCode = getExportCode(html, codeOptions);

  return `${importCode}${moduleCode}${exportCode}`;
}
