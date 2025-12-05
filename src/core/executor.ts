import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { CheckerModule, CheckResult, DocumentContext, HighDupeConfiguration } from './types';
import { DocumentParser } from '../utils/documentParser';

/**
 * Cache entry for a document
 */
interface DocumentCache {
    paragraphHashes: Map<number, string>; // line number -> hash
    results: CheckResult[];
}

/**
 * Manages the lifecycle of checker modules and coordinates checking operations
 */
export class Executor {
    private modules: Map<string, CheckerModule> = new Map();
    private decorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();
    private checkTimer: NodeJS.Timeout | undefined;
    private configuration: HighDupeConfiguration;
    private cache: Map<string, DocumentCache> = new Map(); // document URI -> cache

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
     * Run all enabled checker modules on the current editor with incremental checking
     */
    runChecks(editor: vscode.TextEditor): void {
        const document = editor.document;
        const documentUri = document.uri.toString();

        // Parse document into context
        const context: DocumentContext = DocumentParser.parseDocument(document, editor.selection.active);

        // Get or create cache for this document
        let docCache = this.cache.get(documentUri);
        if (!docCache) {
            docCache = {
                paragraphHashes: new Map(),
                results: []
            };
            this.cache.set(documentUri, docCache);
        }

        // Compute hashes for all paragraphs and identify changes
        const currentHashes = new Map<number, string>();
        const changedParagraphIndices: number[] = [];

        for (let i = 0; i < context.paragraphs.length; i++) {
            const paragraph = context.paragraphs[i];
            const hash = this.hashParagraph(paragraph.text);
            currentHashes.set(i, hash);

            // Check if this paragraph has changed
            const cachedHash = docCache.paragraphHashes.get(i);
            if (cachedHash !== hash) {
                changedParagraphIndices.push(i);
            }
        }

        // Check if number of paragraphs changed (need full recheck)
        const paragraphCountChanged = docCache.paragraphHashes.size !== context.paragraphs.length;

        if (paragraphCountChanged) {
            // Full recheck needed
            const allResults = this.runFullCheck(context);
            docCache.paragraphHashes = currentHashes;
            docCache.results = allResults;
            this.applyDecorations(editor, allResults);
        } else if (changedParagraphIndices.length > 0) {
            // Incremental check: only check changed paragraphs
            const newResults = this.runIncrementalCheck(context, changedParagraphIndices);

            // Remove old results for changed paragraphs
            const unchangedResults = docCache.results.filter(result => {
                const resultLine = result.range.start.line;
                // Keep results that are not in any changed paragraph
                return !changedParagraphIndices.some(idx => {
                    const para = context.paragraphs[idx];
                    return resultLine >= para.startLine && resultLine <= para.endLine;
                });
            });

            // Merge unchanged and new results
            const allResults = [...unchangedResults, ...newResults];
            docCache.paragraphHashes = currentHashes;
            docCache.results = allResults;
            this.applyDecorations(editor, allResults);
        }
        // else: No changes at all - don't reapply decorations (prevents blinking)
    }

    /**
     * Run a full check on all paragraphs
     */
    private runFullCheck(context: DocumentContext): CheckResult[] {
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

        return allResults;
    }

    /**
     * Run check only on specific paragraphs (incremental)
     */
    private runIncrementalCheck(context: DocumentContext, paragraphIndices: number[]): CheckResult[] {
        const allResults: CheckResult[] = [];

        // Create a filtered context with only changed paragraphs
        const filteredContext: DocumentContext = {
            ...context,
            paragraphs: paragraphIndices.map(idx => context.paragraphs[idx])
        };

        for (const module of this.modules.values()) {
            if (module.enabled) {
                try {
                    const results = module.check(filteredContext);
                    allResults.push(...results);
                } catch (error) {
                    console.error(`HighDupe: Error running module '${module.name}':`, error);
                }
            }
        }

        return allResults;
    }

    /**
     * Compute hash for a paragraph text
     */
    private hashParagraph(text: string): string {
        return crypto.createHash('md5').update(text).digest('hex');
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
     * Clear cache for a specific document or all documents
     */
    clearCache(documentUri?: string): void {
        if (documentUri) {
            this.cache.delete(documentUri);
        } else {
            this.cache.clear();
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

        // Clear cache
        this.cache.clear();
    }
}
