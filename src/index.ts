import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

/**
 * Initialization data for the kore_extension extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'kore_extension:plugin',
  description: 'A JupyterLab extension to expand the eponymous service for course management and grade handling between LMS and JupyterHub via LTI 1.3.',
  autoStart: true,
  optional: [ISettingRegistry],
  activate: (app: JupyterFrontEnd, settingRegistry: ISettingRegistry | null) => {
    console.log('JupyterLab extension kore_extension is activated!');

    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(settings => {
          console.log('kore_extension settings loaded:', settings.composite);
        })
        .catch(reason => {
          console.error('Failed to load settings for kore_extension.', reason);
        });
    }
  }
};

export default plugin;
