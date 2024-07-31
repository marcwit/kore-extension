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

// CSS class for styling.
const TOP_AREA_CSS_CLASS = 'jp-Cell';

/**
 * Helper function for capitalizing first letter of a string.
 */
function capitalizeFirstLetter(str: string): string {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

/**
 * Helper function to remove the last letter of a string.
 */
function removeLastLetter(str: string): string {
    return str ? str.slice(0, -1) : str;
}

/**
 * Helper function to add a delay.
 */
async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * Execute a request to the kore service.
 */
async function executeOperation(operation: string, context: string, path?: any): Promise<any> {
    console.log(`Executing asynchronous function with operation: ${operation}; context: ${context}`);

    const requestOptions: { operation: string; body?: any } = { operation };
    if (operation !== 'GET') {
        requestOptions.body = JSON.stringify({ 'path': path });
    }

    try {
        const response = await requestAPI<any>(context, requestOptions);
        console.log(response.message);
        Notification.success(`${response.message}`, { autoClose: false });
        return response;
    } catch (reason) {
        handleOperationError(reason, operation, context);
    }
}

/**
 * Handle errors for operations.
 */
function handleOperationError(reason: any, operation: string, context: string): void {
    if (reason.message === 'NoContentFound') {
        console.log(`No ${context} found that could be copied. Contact administrator or see logs for more details.`);
        Notification.info(`No ${context} found that could be copied. Contact administrator or see logs for more details.`, { autoClose: false });
    } else {
        const operationMap: Record<string, string> = {
            'GET': 'list accessing',
            'POST': 'copying',
            'PUT': 'backing up',
            'PATCH': 'resetting',
            'DELETE': 'deleting'
        };
        const task = operationMap[operation];
        const errorMessage = `${reason.message} while ${removeLastLetter(context)} ${task}. Contact administrator or see logs for more details.`;
        console.error(errorMessage);
        Notification.error(errorMessage, { autoClose: false });
    }
}

/**
 * Create and register a command for a specific operation and context.
 */
function createCommand(operation: string, context: string, commands: any): void {
    commands.addCommand(`kore:${operation}-${context}`, {
        label: `${capitalizeFirstLetter(operation)} ${context}`,
        caption: `${capitalizeFirstLetter(operation)} current ${context}.`,
        execute: async () => await handleCommandExecution(operation, context)
    });
}

/**
 * Handle the execution of a command based on its operation and context.
 */
async function handleCommandExecution(operation: string, context: string): Promise<void> {
    if (operation === 'import') {
        await handleImportOperation(context);
    } else if (['backup', 'reset', 'delete'].includes(operation) && context === 'course') {
        await handleCourseOperation(operation, context);
    } else {
        await executeOperation(operation, context);
    }
}

/**
 * Handle the import operation for a specific context.
 */
async function handleImportOperation(context: string): Promise<void> {
    const routeMap: Record<string, string> = {
        'course': 'courses',
        'assignment': 'assignments',
        'problem': 'problems'
    };
    const route = routeMap[context];

    try {
        const requestData = await executeOperation('GET', route);
        const result = await InputDialog.getItem({
            title: `Select ${context} to import:`,
            items: requestData.names,
            okLabel: 'Import'
        });

        if (result.button.accept) {
            console.log(`Importing ${context}: ${result.value}`);
            const index = requestData.names.indexOf(result.value);
            const path = requestData.paths[index];
            await executeOperation('POST', context, path);
        }
    } catch (reason) {
        console.error(`Error while trying to copy ${context}.`);
    }
}

/**
 * Handle course-specific operations like backup, reset, and delete.
 */
async function handleCourseOperation(operation: string, context: string): Promise<void> {
    if (operation === 'delete') {
        try {
            const requestData = await executeOperation('GET', 'courses/active');
            const result = await InputDialog.getItem({
                title: `Select ${context} to delete:`,
                items: requestData.names,
                okLabel: 'Delete'
            });

            if (result.button.accept) {
                console.log(`Deleting ${context}: ${result.value}`);
                const index = requestData.names.indexOf(result.value);
                const path = requestData.paths[index];
                await executeOperation('DELETE', 'courses', path);
            }
        } catch (reason) {
            console.error(`Error while trying to delete ${context}.`);
        }
    } else {
        const dialogResult = await showDialog({
            title: `${operation} ${context}`,
            body: `Are you certain that you want to ${operation} the current ${context}?`,
            buttons: [Dialog.cancelButton(), Dialog.okButton({ label: capitalizeFirstLetter(operation) })]
        });

        if (dialogResult.button.accept) {
            console.log(`${operation}ing ${context}.`);
            await executeOperation(operation === 'backup' ? 'PUT' : 'PATCH', 'courses');
        }
    }
}

/**
 * Send grades to LMS with a confirmation dialog and notification handling.
 */
async function sendGrades(): Promise<ReadonlyJSONValue> {
    console.log('Executing asynchronous function sendGrades()');
    try {
        const response = await requestAPI<any>('grades', { method: 'POST' });
        await delay(500);
        return response;
    } catch (reason) {
        await delay(500);
        if (reason instanceof Error) {
            console.error(`${reason.message} while sending grades to LMS. Contact administrator or see logs for more details.`);
            return Promise.reject(reason.message);
        } else {
            console.error(`An unknown error occurred while sending grades to LMS. Contact administrator or see logs for more details.`);
            return Promise.reject('An unknown error occurred.');
        }
    }
}

/**
 * The main plugin for the JupyterLab extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
    id: 'kore-extension:plugin',
    description: 'A JupyterLab extension for course management and grade handling between LMS and JupyterHub via LTI 1.3.',
    autoStart: true,
    activate: async (app: JupyterFrontEnd) => {
        console.log('JupyterLab extension kore-extension is activated!');

        const { commands } = app;

        // Create course title widget and add it to the top area.
        const courseTitle = document.createElement('div');
        courseTitle.textContent = await executeOperation('GET', 'title').then(result => result.title);
        const courseTitleWidget = new Widget({ node: courseTitle });
        courseTitleWidget.id = "kore-extension-course-title";
        courseTitleWidget.addClass(TOP_AREA_CSS_CLASS);
        app.shell.add(courseTitleWidget, 'top', { rank: 1000 });

        // Register commands.
        commands.addCommand('kore:send-grades', {
            label: 'Send all grades to LMS',
            caption: 'Used to transfer all grades of current course to LMS.',
            execute: async () => {
                const result = await showDialog({
                    title: 'Confirm Send Grades',
                    body: 'Are you sure you want to send all grades to LMS?',
                    buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'Send' })]
                });

                if (result.button.accept) {
                    Notification.promise(
                        sendGrades(), {
                        pending: { message: 'Sending grades to LMS...', options: { autoClose: false } },
                        success: { message: () => 'Sending grades successful.' },
                        error: { message: (reason: any) => `Sending grades failed with ${reason}` }
                    });
                } else {
                    console.log('User cancelled the operation.');
                }
            }
        });

        createCommand('import', 'course', commands);
        createCommand('import', 'assignment', commands);
        createCommand('import', 'problem', commands);
        createCommand('backup', 'course', commands);
        createCommand('reset', 'course', commands);
        createCommand('delete', 'course', commands);
    }
};

export default plugin;
