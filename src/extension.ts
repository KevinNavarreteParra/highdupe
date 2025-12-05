import * as vscode from 'vscode';
import { Executor } from './core/executor';
import { ModuleRegistry } from './modules/registry';
import { HighDupeConfiguration } from './core/types';

let executor: Executor | undefined;
let isCheckingEnabled = false;

export function activate(context: vscode.ExtensionContext) {
    console.log('HighDupe extension activated!');

    // Create executor
    executor = new Executor();

    // Register all modules
    ModuleRegistry.registerAll(executor);

    // Load configuration
    loadConfiguration();

    // Register configuration change listener
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('highdupe')) {
                loadConfiguration();

                // Re-run checks if enabled
                if (isCheckingEnabled && vscode.window.activeTextEditor) {
                    executor?.runChecks(vscode.window.activeTextEditor);
                }
            }
        })
    );

    // Register command: Find Repeated Words (manual trigger)
    const findRepeatedWordsCommand = vscode.commands.registerCommand(
        'highdupe.findRepeatedWords',
        () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('No active editor');
                return;
            }

            if (!executor) {
                vscode.window.showErrorMessage('HighDupe executor not initialized');
                return;
            }

            // Run checks
            executor.runChecks(editor);
            vscode.window.showInformationMessage('HighDupe: Checks completed');
        }
    );

    // Register command: Toggle Continuous Checking
    const toggleCheckingCommand = vscode.commands.registerCommand(
        'highdupe.toggleChecking',
        () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('No active editor');
                return;
            }

            if (!executor) {
                vscode.window.showErrorMessage('HighDupe executor not initialized');
                return;
            }

            if (isCheckingEnabled) {
                // Disable
                executor.stopContinuousChecking();
                isCheckingEnabled = false;
                vscode.window.showInformationMessage('HighDupe: Continuous checking disabled');
            } else {
                // Enable
                executor.startContinuousChecking(editor);
                isCheckingEnabled = true;
                vscode.window.showInformationMessage('HighDupe: Continuous checking enabled');
            }
        }
    );

    // Listen for editor changes
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && isCheckingEnabled && executor) {
                // When switching editors, restart checking on the new editor
                executor.stopContinuousChecking();
                executor.startContinuousChecking(editor);
            }
        })
    );

    // Listen for text document changes (for incremental checking in the future)
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (isCheckingEnabled && executor && vscode.window.activeTextEditor) {
                // For now, we rely on the interval-based checking
                // In the future, we could implement incremental checking here
            }
        })
    );

    // Auto-start continuous checking for LaTeX files
    if (vscode.window.activeTextEditor) {
        const doc = vscode.window.activeTextEditor.document;
        if (doc.languageId === 'latex') {
            executor.startContinuousChecking(vscode.window.activeTextEditor);
            isCheckingEnabled = true;
            console.log('HighDupe: Auto-started continuous checking for LaTeX file');
        }
    }

    // Add commands to subscriptions
    context.subscriptions.push(findRepeatedWordsCommand);
    context.subscriptions.push(toggleCheckingCommand);

    // Add executor to subscriptions for cleanup
    context.subscriptions.push({
        dispose: () => {
            if (executor) {
                executor.dispose();
                executor = undefined;
            }
        }
    });

    console.log('HighDupe: Extension fully activated with', executor.getModules().length, 'modules');
}

/**
 * Load configuration from VSCode settings
 */
function loadConfiguration(): void {
    if (!executor) {
        return;
    }

    const config = vscode.workspace.getConfiguration('highdupe');

    // Build configuration object
    const highdupeConfig: HighDupeConfiguration = {
        checkInterval: config.get('checkInterval', 3000),
        modules: {}
    };

    // Load duplicate word module settings
    const duplicateWordEnabled = config.get('modules.duplicateWord.enabled', true);
    const duplicateWordScope = config.get('modules.duplicateWord.scope', 'paragraph');
    const globalExcludeWords = config.get('modules.duplicateWord.excludeWords.global', []);
    const projectExcludeWords = config.get('modules.duplicateWord.excludeWords.project', []);

    highdupeConfig.modules['duplicate-word'] = {
        enabled: duplicateWordEnabled,
        scope: duplicateWordScope,
        excludeWords: {
            global: globalExcludeWords,
            project: projectExcludeWords
        }
    };

    // Apply configuration
    executor.configure(highdupeConfig);

    console.log('HighDupe: Configuration loaded', highdupeConfig);
}

export function deactivate() {
    if (executor) {
        executor.dispose();
        executor = undefined;
    }
}
