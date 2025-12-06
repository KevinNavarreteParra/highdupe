import * as vscode from 'vscode';
import { Executor } from './core/executor';
import { ModuleRegistry } from './modules/registry';
import { HighDupeConfiguration } from './core/types';
import { HighDupeCodeActionProvider } from './actions/codeActionProvider';

let executor: Executor | undefined;
let isCheckingEnabled = false;
let statusBarItem: vscode.StatusBarItem | undefined;
let codeActionProvider: HighDupeCodeActionProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('HighDupe extension activated!');

    // Create executor
    executor = new Executor();

    // Register all modules
    ModuleRegistry.registerAll(executor);

    // Create and register code action provider
    codeActionProvider = new HighDupeCodeActionProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            { language: 'latex' },
            codeActionProvider,
            {
                providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
            }
        )
    );

    // Set callback to update code action provider when checks complete
    executor.setOnCheckCompleteCallback((documentUri: string) => {
        if (codeActionProvider && executor) {
            const results = executor.getLatestResults(documentUri);
            codeActionProvider.updateCheckResults(documentUri, results);
        }
    });

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'highdupe.toggleChecking';
    statusBarItem.tooltip = 'Click to toggle HighDupe checking';
    context.subscriptions.push(statusBarItem);
    updateStatusBar();
    statusBarItem.show();

    // Load configuration
    loadConfiguration();

    // Register configuration change listener
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('highdupe')) {
                loadConfiguration();

                // Re-run checks if enabled
                if (isCheckingEnabled && vscode.window.activeTextEditor) {
                    runChecksAndUpdate(vscode.window.activeTextEditor);
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
            runChecksAndUpdate(editor);
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
                updateStatusBar();
                vscode.window.showInformationMessage('HighDupe: Continuous checking disabled');
            } else {
                // Enable
                executor.startContinuousChecking(editor);
                isCheckingEnabled = true;
                updateStatusBar();
                vscode.window.showInformationMessage('HighDupe: Continuous checking enabled');
            }
        }
    );

    // Register command: Add word to global exclude list
    const addToGlobalExcludeListCommand = vscode.commands.registerCommand(
        'highdupe.addToGlobalExcludeList',
        async (word: string) => {
            const config = vscode.workspace.getConfiguration('highdupe');
            const globalExcludeWords: string[] = config.get('modules.duplicateWord.excludeWords.global', []);

            if (!globalExcludeWords.includes(word.toLowerCase())) {
                globalExcludeWords.push(word.toLowerCase());
                await config.update('modules.duplicateWord.excludeWords.global', globalExcludeWords, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`Added "${word}" to global exclude list`);

                // Trigger a re-check
                if (isCheckingEnabled && vscode.window.activeTextEditor && executor) {
                    runChecksAndUpdate(vscode.window.activeTextEditor);
                }
            } else {
                vscode.window.showInformationMessage(`"${word}" is already in the global exclude list`);
            }
        }
    );

    // Register command: Add word to project exclude list
    const addToProjectExcludeListCommand = vscode.commands.registerCommand(
        'highdupe.addToProjectExcludeList',
        async (word: string) => {
            const config = vscode.workspace.getConfiguration('highdupe');
            const projectExcludeWords: string[] = config.get('modules.duplicateWord.excludeWords.project', []);

            if (!projectExcludeWords.includes(word.toLowerCase())) {
                projectExcludeWords.push(word.toLowerCase());
                await config.update('modules.duplicateWord.excludeWords.project', projectExcludeWords, vscode.ConfigurationTarget.Workspace);
                vscode.window.showInformationMessage(`Added "${word}" to project exclude list`);

                // Trigger a re-check
                if (isCheckingEnabled && vscode.window.activeTextEditor && executor) {
                    runChecksAndUpdate(vscode.window.activeTextEditor);
                }
            } else {
                vscode.window.showInformationMessage(`"${word}" is already in the project exclude list`);
            }
        }
    );

    // Register command: Ignore this instance
    const ignoreInstanceCommand = vscode.commands.registerCommand(
        'highdupe.ignoreInstance',
        (documentUri: string, line: number, character: number, word: string) => {
            if (!executor) {
                vscode.window.showErrorMessage('HighDupe executor not initialized');
                return;
            }

            executor.addIgnoredInstance(documentUri, line, character, word);
            vscode.window.showInformationMessage(`Ignored this instance of "${word}"`);

            // Trigger a re-check to update decorations
            if (isCheckingEnabled && vscode.window.activeTextEditor) {
                runChecksAndUpdate(vscode.window.activeTextEditor);
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
            updateStatusBar();
            console.log('HighDupe: Auto-started continuous checking for LaTeX file');
        }
    }

    // Add commands to subscriptions
    context.subscriptions.push(findRepeatedWordsCommand);
    context.subscriptions.push(toggleCheckingCommand);
    context.subscriptions.push(addToGlobalExcludeListCommand);
    context.subscriptions.push(addToProjectExcludeListCommand);
    context.subscriptions.push(ignoreInstanceCommand);

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
 * Run checks and update code action provider
 */
function runChecksAndUpdate(editor: vscode.TextEditor): void {
    if (!executor) {
        return;
    }

    executor.runChecks(editor);

    // Update code action provider with latest results
    if (codeActionProvider) {
        const documentUri = editor.document.uri.toString();
        const results = executor.getLatestResults(documentUri);
        codeActionProvider.updateCheckResults(documentUri, results);
    }
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

/**
 * Update the status bar to reflect current state
 */
function updateStatusBar(): void {
    if (!statusBarItem || !executor) {
        return;
    }

    const moduleCount = executor.getModules().filter(m => m.enabled).length;

    if (isCheckingEnabled) {
        statusBarItem.text = `$(check) HighDupe: ${moduleCount} module${moduleCount !== 1 ? 's' : ''}`;
        statusBarItem.backgroundColor = undefined;
        statusBarItem.tooltip = `HighDupe is active with ${moduleCount} module${moduleCount !== 1 ? 's' : ''}. Click to disable.`;
    } else {
        statusBarItem.text = `$(circle-outline) HighDupe: Off`;
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        statusBarItem.tooltip = 'HighDupe is disabled. Click to enable.';
    }
}

export function deactivate() {
    if (executor) {
        executor.dispose();
        executor = undefined;
    }
    if (statusBarItem) {
        statusBarItem.dispose();
        statusBarItem = undefined;
    }
}
