import * as vscode from 'vscode';
import { CheckerModule, CheckResult, DocumentContext, HighDupeConfiguration } from './types';
import { DocumentParser } from '../utils/documentParser';

/**
 * Manages the lifecycle of checker modules and coordinates checking operations
 */
export class Executor {
    private modules: Map<string, CheckerModule> = new Map();
    private decorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();
    private checkTimer: NodeJS.Timeout | undefined;
    private configuration: HighDupeConfiguration;

    constructor() {
        // Default configuration
        this.configuration = {
            checkInterval: 3000, // 3 seconds
            modules: {}
        };

        this.initializeDecorationTypes();
    }

    /**
     * Initialize decoration types for different issue types
     */
    private initializeDecorationTypes(): void {
        // Yellow underline for duplicate words
        this.decorationTypes.set('duplicate-word', vscode.window.createTextEditorDecorationType({
            textDecoration: 'underline wavy',
            color: '#ffd700'
        }));

        // Green underline for passive voice
        this.decorationTypes.set('passive-voice', vscode.window.createTextEditorDecorationType({
            textDecoration: 'underline wavy',
            color: '#00ff00'
        }));

        // Blue underline for style suggestions (adverbs, contractions)
        this.decorationTypes.set('adverb', vscode.window.createTextEditorDecorationType({
            textDecoration: 'underline wavy',
            color: '#4169e1'
        }));

        this.decorationTypes.set('contraction', vscode.window.createTextEditorDecorationType({
            textDecoration: 'underline wavy',
            color: '#4169e1'
        }));

        // Purple underline for structure issues (paragraph length)
        this.decorationTypes.set('paragraph-length', vscode.window.createTextEditorDecorationType({
            textDecoration: 'underline wavy',
            color: '#9370db'
        }));

        // Orange for transition words
        this.decorationTypes.set('transition-word', vscode.window.createTextEditorDecorationType({
            textDecoration: 'underline wavy',
            color: '#ff8c00'
        }));
    }

    /**
     * Register a checker module
     */
    registerModule(module: CheckerModule): void {
        this.modules.set(module.name, module);
        console.log(`HighDupe: Registered module '${module.displayName}'`);
    }

    /**
     * Unregister a checker module
     */
    unregisterModule(moduleName: string): void {
        this.modules.delete(moduleName);
        console.log(`HighDupe: Unregistered module '${moduleName}'`);
    }

    /**
     * Get all registered modules
     */
    getModules(): CheckerModule[] {
        return Array.from(this.modules.values());
    }

    /**
     * Get a specific module by name
     */
    getModule(name: string): CheckerModule | undefined {
        return this.modules.get(name);
    }

    /**
     * Update configuration
     */
    configure(configuration: Partial<HighDupeConfiguration>): void {
        this.configuration = {
            ...this.configuration,
            ...configuration
        };

        // Apply configuration to modules
        if (configuration.modules) {
            for (const [moduleName, moduleSettings] of Object.entries(configuration.modules)) {
                const module = this.modules.get(moduleName);
                if (module) {
                    module.configure(moduleSettings);
                }
            }
        }
    }

    /**
     * Start continuous checking
     */
    startContinuousChecking(editor: vscode.TextEditor): void {
        // Clear existing timer
        this.stopContinuousChecking();

        // Run initial check
        this.runChecks(editor);

        // Set up periodic checking
        this.checkTimer = setInterval(() => {
            if (vscode.window.activeTextEditor === editor) {
                this.runChecks(editor);
            }
        }, this.configuration.checkInterval);

        console.log(`HighDupe: Started continuous checking (interval: ${this.configuration.checkInterval}ms)`);
    }

    /**
     * Stop continuous checking
     */
    stopContinuousChecking(): void {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = undefined;
            console.log('HighDupe: Stopped continuous checking');
        }
    }

    /**
     * Run all enabled checker modules on the current editor
     */
    runChecks(editor: vscode.TextEditor): void {
        const document = editor.document;

        // Parse document into context
        const context: DocumentContext = DocumentParser.parseDocument(document, editor.selection.active);

        // Run all enabled modules
        const allResults: CheckResult[] = [];

        for (const module of this.modules.values()) {
            if (module.enabled) {
                try {
                    const results = module.check(context);
                    allResults.push(...results);
                } catch (error) {
                    console.error(`HighDupe: Error running module '${module.name}':`, error);
                }
            }
        }

        // Apply decorations
        this.applyDecorations(editor, allResults);
    }

    /**
     * Apply decorations to the editor based on check results
     */
    private applyDecorations(editor: vscode.TextEditor, results: CheckResult[]): void {
        // Group results by issue type
        const resultsByType = new Map<string, CheckResult[]>();

        for (const result of results) {
            const issueType = result.issueType;
            if (!resultsByType.has(issueType)) {
                resultsByType.set(issueType, []);
            }
            resultsByType.get(issueType)!.push(result);
        }

        // Clear all existing decorations
        for (const decorationType of this.decorationTypes.values()) {
            editor.setDecorations(decorationType, []);
        }

        // Apply new decorations
        for (const [issueType, issueResults] of resultsByType.entries()) {
            const decorationType = this.decorationTypes.get(issueType);
            if (!decorationType) {
                continue;
            }

            const decorations: vscode.DecorationOptions[] = issueResults.map(result => ({
                range: result.range,
                hoverMessage: this.createHoverMessage(result)
            }));

            editor.setDecorations(decorationType, decorations);
        }
    }

    /**
     * Create hover message for a check result
     */
    private createHoverMessage(result: CheckResult): vscode.MarkdownString {
        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;

        markdown.appendMarkdown(`**${this.getSeverityIcon(result.severity)} ${result.message}**\n\n`);

        if (result.suggestion) {
            markdown.appendMarkdown(`💡 *${result.suggestion}*\n\n`);
        }

        markdown.appendMarkdown(`---\n\n`);
        markdown.appendMarkdown(`Issue type: \`${result.issueType}\`\n\n`);
        markdown.appendMarkdown(`Text: "${result.text}"`);

        return markdown;
    }

    /**
     * Get emoji icon for severity level
     */
    private getSeverityIcon(severity: string): string {
        switch (severity) {
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return '•';
        }
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.stopContinuousChecking();

        // Dispose decoration types
        for (const decorationType of this.decorationTypes.values()) {
            decorationType.dispose();
        }
        this.decorationTypes.clear();

        // Clear modules
        this.modules.clear();
    }
}
