import {
    JupyterFrontEnd,
    JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
    Dialog,
    showDialog,
    InputDialog,
    Notification
} from '@jupyterlab/apputils';

import { requestAPI } from './handler';

import { ReadonlyJSONValue } from '@lumino/coreutils';

import { Widget } from '@lumino/widgets';

// Is this the proper style? Check if there is a more fitting one or create own.
const TOP_AREA_CSS_CLASS = 'jp-Cell';

/**
 * Initialization data for the kore-extension extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
    id: 'kore-extension:plugin',
    description: 'A JupyterLab extension to expand the eponymous service for course management and grade handling between LMS and JupyterHub via LTI 1.3.',
    autoStart: true,
    activate: async (app: JupyterFrontEnd) => {
        console.log('JupyterLab extension kore-extension is activated!');

        const { commands } = app;

        // Define types for valid operations and context, also define specific error messages which have to be handled separately.
        type OperationType = 'import' | 'get' | 'copy' | 'backup' | 'reset' | 'delete' | 'remove';
        type ContextType = 'title' | 'course' | 'courses' | 'assignment' | 'assignments' | 'problem' | 'problems';

        // Helper function for HTTP requests to the kore service (see kore.py).
        async function executeOperation(operation: OperationType, context: ContextType, path?: any): Promise<any> {
            console.log(`Executing asynchronous function with operation: ${operation}; context: ${context}`);

            // Defining map for operation -> HTTP method to use.
            const methodMap: Record<OperationType, string> = {
                import: 'GET',
                get: 'GET',
                copy: 'POST',
                backup: 'PUT',
                reset: 'PATCH',
                delete: 'DELETE',
                remove: 'DELETE'
            };
            const method = methodMap[operation];

            // Check if valid operation was supplied.
            if (!method) {
                console.error(`Invalid operation: ${operation}`);
                Notification.error(`Invalid operation: ${operation}`, { autoClose: false });
                return;
            }

            // Defining map for context -> routes (see kore.py) to use.
            const routeMap: Record<ContextType, string> = {
                title: 'title',
                course: 'courses',
                courses: 'courses',
                assignment: 'assignments',
                assignments: 'assignments',
                problem: 'problems',
                problems: 'problems',
            };
            const route = routeMap[context];

            // Check if valid context was supplied.
            if (!route) {
                console.error(`Invalid context: ${context}`);
                Notification.error(`Invalid context: ${context}`, { autoClose: false });
                return;
            }

            const requestOptions: { method: string; body?: any } = { method };
            if (method !== 'GET') {
                requestOptions.body = JSON.stringify({ 'path': path });
            }

            return requestAPI<any>(route, requestOptions)
            .then(response => {
                console.log(response.message);
                Notification.success(`${response.message}`, { autoClose: false });
                return response as any;
            })
            .catch(reason => {
                if (reason.message === 'NoContentFound') {
                    console.log(`No ${route} found that could be copied. Contact administrator or see logs for more details.`);
                    Notification.info(`No ${route} found that could be copied. Contact administrator or see logs for more details.`, { autoClose: false });
                } else {
                    console.error(`${reason.message} while ${context} ${operation}. Contact administrator or see logs for more details.`);
                    Notification.error(`${reason.message} while ${context} ${operation}. Contact administrator or see logs for more details.`, { autoClose: false });
                }
            });
        }

        // Helper function for capitalizing first letter of a string.
        function capitalizeFirstLetter(str: string): string {
            // Return original string if it's empty or undefined.
            if (!str) {
                return str;
            }
            return str.charAt(0).toUpperCase() + str.slice(1);
        }

        // Helper function for adding a command for miscellaneous functions.
        function createCommand(operation: OperationType, context: ContextType) {
            return {
                label: `${capitalizeFirstLetter(operation)} ${context}`,
                caption: `${capitalizeFirstLetter(operation)} current ${context}.`,
                execute: async () => {
                    if (operation === 'backup') {
                        await executeOperation(operation, context);
                    }
                    else if (operation == 'import') {
                        try {
                            let requestData = await executeOperation(operation, context);

                            const result = await InputDialog.getItem({
                                title: `Select ${context} to import:`,
                                items: requestData.names,
                                okLabel: 'Import',
                            });

                            if (result.button.accept) {
                                console.log(`Importing ${context}: ${result.value}`);
                                let index = requestData.names.indexOf(result.value);
                                let path = requestData.paths[index];
                                await executeOperation('copy', context, path);
                            }
                        } catch (reason) {
                            console.error(`Error while trying to copy ${context}.`);
                        }
                    }
                    else {
                        showDialog({
                            title: `${operation} ${context}`,
                            body: `Are you certain that you want to ${operation} the current ${context}?`,
                            buttons: [
                                Dialog.cancelButton(),
                                Dialog.okButton({ label: capitalizeFirstLetter(operation) })
                            ]
                        }).then(async result => {
                            if (result.button.accept) {
                                console.log(`${operation}ing ${context}.`);
                                await executeOperation(operation, context);
                            }
                        }).catch((reason) => {
                            console.error(`Error while trying to ${operation} ${context}.`);
                        });
                    }
                }
            };
        }

        // Create the HTML content of the courseTitleWidget.
        const courseTitle = document.createElement('div');
        courseTitle.textContent = await executeOperation('get', 'title').then(result => result.title);

        // Create the widget, apply style and add it to the top area.
        const courseTitleWidget = new Widget({ node: courseTitle });
        courseTitleWidget.id = "kore-extension-course-title";
        courseTitleWidget.addClass(TOP_AREA_CSS_CLASS);
        app.shell.add(courseTitleWidget, 'top', { rank: 1000 });

        // Helper function for sendGrades() do add an delay by default. Otherwise there may be an update issue for the pending notification. This has to be addressed later.
        async function delay(ms: number) {
            return new Promise( resolve => setTimeout(resolve, ms) );
        }

        async function sendGrades(): Promise<ReadonlyJSONValue> {
            console.log('Executing asynchronous function sendGrades()');

            return requestAPI<any>('grades', {
                method: 'POST'
            })
            .then(async response => {
                console.log(response.message);
                // Workaround for notification stuck in pending state, which is probably related to a timing issue.
                // This is handled with a delay right now but has to be addressed later.
                // After resolving the root of the problem the delay function and 'async' before reason in this .catch block may be deleted.
                await delay(500);
                return response as any;
            })
            .catch(async reason => {
                console.error(`${reason.message} while sending grades to LMS. Contact administrator or see logs for more details.`);
                // Workaround for notification stuck in pending state, which is probably related to a timing issue.
                // This is handled with a delay right now but has to be addressed later.
                // After resolving the root of the problem the delay function and 'async' before reason in this .catch block may be deleted.
                await delay(500);
                return Promise.reject(reason.message);
            });
        };

        // Command to send grades of all students of current course to the LMS.
        commands.addCommand('kore:send-grades', {
            label: 'Send all grades to LMS',
            caption: 'Used to transfer all grades of current course to LMS.',
            execute: async (args: any) => {
                // Double check with user to send grades.
                const result = await showDialog({
                    title: 'Confirm Send Grades',
                    body: 'Are you sure you want to send all grades to LMS?',
                    buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'Send' })]
                });

                if (result.button.accept) {
                    Notification.promise(
                        sendGrades(), {
                        pending: { message: 'Sending grades to LMS...', options: { autoClose: false } },
                        success: { message: (result: any) => 'Sending grades successful.' },
                        error: { message: (reason: any) => `Sending grades failed with ${reason}` }
                    });
                } else {
                    console.log('User cancelled the operation.');
                }
            }
        });

        // ImportCommand will open a dialog with a dropdown menu, where one can choose a course/assignment/problem. Which is copied to the local home directory of the formgrader.
        // Afterwards this course/assignment/problem is accessible through the 'Formgrader' in the JupyterHub.
        commands.addCommand('kore:import-course', createCommand('import', 'course'));
        commands.addCommand('kore:import-assignment', createCommand('import', 'assignment'));
        commands.addCommand('kore:import-problem', createCommand('import', 'problem'));

        commands.addCommand('kore:backup-course', createCommand('backup', 'course'));
        commands.addCommand('kore:reset-course', createCommand('reset', 'course'));
        commands.addCommand('kore:delete-course', createCommand('delete', 'course'));
    }
};

export default plugin;
