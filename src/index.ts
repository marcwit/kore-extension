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
import { Widget } from '@lumino/widgets';

class MultilineBodyWidget extends Widget {
    constructor(preText: string, courseName: string, postText: string) {
        super();

        const preTextDiv = document.createElement('div');
        preTextDiv.style.whiteSpace = 'pre-line';
        preTextDiv.textContent = preText;

        const courseNameDiv = document.createElement('div');
        courseNameDiv.style.whiteSpace = 'pre-line';
        courseNameDiv.style.fontWeight = 'bold';
        courseNameDiv.style.fontSize = '20px';
        courseNameDiv.textContent = courseName;

        const postTextDiv = document.createElement('div');
        postTextDiv.style.whiteSpace = 'pre-line';
        postTextDiv.textContent = postText;

        this.node.appendChild(preTextDiv);
        this.node.appendChild(courseNameDiv);
        this.node.appendChild(postTextDiv);
    }
}


/**
 * Helper function for capitalizing first letter of a string.
 */
function capitalizeFirstLetter(str: string): string {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
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
 * Execute a request to the kore service.
 */
async function executeImportOperation(operation: string, context: string, fromPath?: any, toPath?: any): Promise<any> {
    console.log(`Executing asynchronous function with operation: ${operation}; context: ${context}`);

    const requestOptions: RequestInit = { method: operation, headers: { 'Content-Type': 'application/json' } };
    requestOptions.body = JSON.stringify({ 'fromPath': fromPath, 'toPath': toPath });

    try {
        const response = await requestAPI<any>(context, requestOptions);
        console.log(response.message);
        Notification.success(`${response.message}`, { autoClose: 1000 });
        return response;
    } catch (reason) {
        handleOperationError(reason, operation, context);
    }
}

/**
 * Execute a request to the kore service.
 */
async function executeOperation(operation: string, context: string, path?: any, name?: any): Promise<any> {
    console.log(`Executing asynchronous function with operation: ${operation}; context: ${context}`);

    const requestOptions: RequestInit = { method: operation, headers: { 'Content-Type': 'application/json' } };
    if (operation === 'PUT') {
        requestOptions.body = JSON.stringify({ 'path': path, 'name': name });
    } else if (['POST', 'PATCH', 'DELETE'].includes(operation)) {
        requestOptions.body = JSON.stringify({ 'path': path });
    } else {
        console.log('TODO');
    }

    try {
        const response = await requestAPI<any>(context, requestOptions);
        console.log(response.message);
        if (context !== 'grades') { Notification.success(`${response.message}`, { autoClose: 1000 }); }
        return response;
    } catch (reason) {
        handleOperationError(reason, operation, context);
    }
}

/**
 * Handle errors for operations.
 */
function handleOperationError(reason: any, operation: string, context: string): void {
    if (reason.message === 'NoContentError') {
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
        const errorMessage = `${reason.message} while ${context} ${task}. Contact administrator or see logs for more details.`;
        console.error(errorMessage);
        Notification.error(errorMessage, { autoClose: false });
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
        const requestFromData = await executeOperation('GET', route);
        const fromInputDialog = await InputDialog.getItem({
            title: `Select ${context} to import (FROM):`,
            items: requestFromData.names,
            okLabel: 'Proceed'
        });

        if (!fromInputDialog.button.accept) return;

        const requestToData = await executeOperation('GET', 'courses/active');
        const toInputDialog = await InputDialog.getItem({
            title: `Select target course (TO):`,
            items: requestToData.names,
            okLabel: 'Import'
        });

        if (toInputDialog.button.accept) {
            const fromIndex = requestFromData.names.indexOf(fromInputDialog.value);
            const fromPath = requestFromData.paths[fromIndex];

            const toIndex = requestToData.names.indexOf(toInputDialog.value);
            const toPath = requestToData.paths[toIndex];

            console.log(`Importing ${context} from ${fromPath} to ${toPath}`);
            await executeImportOperation('POST', route, fromPath, toPath);
        }
    } catch (reason) {
        console.error(`Error while trying to copy ${context}.`);
    }
}

/**
 * Handle course-specific operations like backup, reset, and delete.
 */
async function handleCourseOperation(operation: string, context: string): Promise<void> {
    try {
        const requestData = await executeOperation('GET', 'courses/active');
        const inputDialog = await InputDialog.getItem({
            title: `Select course to ${operation}:`,
            items: requestData.names,
            okLabel: capitalizeFirstLetter(operation)
        });

        if (inputDialog.button.accept) {
            const index = requestData.names.indexOf(inputDialog.value);
            const path = requestData.paths[index];

            if (operation == 'delete') {
                const confirmDialog = await showDialog({
                    title: 'Confirmation Required',
                    body: 'Please confirm the deletion? This process cannot be stopped!',
                    buttons: [
                        Dialog.cancelButton({ label: 'Abort' }),
                        Dialog.okButton({ label: 'Delete' })
                    ]
                });

                if (confirmDialog.button.accept) {
                    await executeOperation('DELETE', 'courses', path, undefined);
                }
            } else if (operation == 'backup') {
                const name = requestData.names[index];
                await executeOperation('PUT', 'courses', path, name);
            } else {
                await executeOperation('PATCH', 'courses', path, undefined);
            }
        }
    } catch (reason) {
        console.error(`Error while trying to ${operation}.`);
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

        // Register commands.
        commands.addCommand('kore:send-grades', {
            label: 'Send grades to LMS',
            caption: 'Used to transfer grades of a course to LMS.',
            execute: async () => {
                const config = await requestAPI<any>('config', { method: 'GET' });
                var gradingScope = (config.grading_scope === 'all' || config.grading_scope === 'current') ? config.grading_scope : 'current';

                // change case for current and all
                // for 'current' only the course the user came in from shall be graded
                // if it is 'all' check where the current user is instructor and give dropdown with courses

                if (gradingScope === 'current') {
                    const currentCourseData = await executeOperation('GET', 'courses/current');
                    const currentCourseName = currentCourseData.names[0]
                    const currentCoursePath = currentCourseData.paths[0]

                    const result = await showDialog({
                        title: 'Confirm Send Grades',
                        body: new MultilineBodyWidget(
                            `You are about to send grades to the LMS for the course:\n\n`,
                            `${currentCourseName}\n\n`,
                            `This behaviour is specified in the global configuration.
                            If you intend to send grades for a different course, please log in to JupyterHub from the associated course's LMS page. \n
                            Do you wish to proceed?`
                        ),
                        buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'Proceed' })]
                    });

                    console.log(result);
                    if (result.button.accept) {
                        Notification.promise(
                            executeOperation('POST', 'grades', currentCoursePath), {
                            pending: { message: 'Sending grades to LMS...', options: { autoClose: false } },
                            success: { message: () => 'Sending grades successful.' },
                            error: { message: (reason: any) => `Sending grades failed with ${reason}` }
                        });
                    } else {
                        console.log('User cancelled the operation.');
                    }
                } else if (gradingScope === 'all') {
                    const requestCoursesData = await executeOperation('GET', 'courses/active');
                    const coursesDialog = await InputDialog.getItem({
                        title: `Select course that shall be graded:`,
                        items: requestCoursesData.names,
                        okLabel: 'Grade'
                    });

                    if (coursesDialog.button.accept) {
                        const index = requestCoursesData.names.indexOf(coursesDialog.value);
                        const path = requestCoursesData.paths[index];

                        Notification.promise(
                            executeOperation('POST', 'grades', path), {
                            pending: { message: 'Sending grades to LMS...', options: { autoClose: false } },
                            success: { message: () => 'Sending grades successful.' },
                            error: { message: (reason: any) => `Sending grades failed with ${reason}` }
                        });
                    } else {
                        console.log('User cancelled the operation.');
                    }
                } else {
                    Notification.info(`Something unexpected occurred while trying to send grades. Contact administrator or see logs for more details.`, { autoClose: false });
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
