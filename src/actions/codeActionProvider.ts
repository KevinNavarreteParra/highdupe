import * as vscode from 'vscode';
import { CheckResult } from '../core/types';

/**
 * Provides code actions (quick fixes) for HighDupe issues
 */
export class HighDupeCodeActionProvider implements vscode.CodeActionProvider {
    private checkResults: Map<string, CheckResult[]> = new Map();

    /**
     * Update the stored check results for a document
     */
    updateCheckResults(documentUri: string, results: CheckResult[]): void {
        this.checkResults.set(documentUri, results);
    }

    /**
     * Clear check results for a document
     */
    clearCheckResults(documentUri?: string): void {
        if (documentUri) {
            this.checkResults.delete(documentUri);
        } else {
            this.checkResults.clear();
        }
    }

    /**
     * Provide code actions for a given range in the document
     */
    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CodeAction[]> {
        const documentUri = document.uri.toString();
        const results = this.checkResults.get(documentUri);

        console.log('HighDupe CodeActionProvider: provideCodeActions called');
        console.log('  Document URI:', documentUri);
        console.log('  Range:', range);
        console.log('  Diagnostics in context:', context.diagnostics.length);
        console.log('  Results count:', results?.length || 0);

        if (!results || results.length === 0) {
            return [];
        }

        const actions: vscode.CodeAction[] = [];
        const wordsProcessed = new Set<string>(); // Track words we've already added actions for

        // If diagnostics are available, use them (preferred method)
        if (context.diagnostics.length > 0) {
            // Process diagnostics provided by VS Code
            for (const diagnostic of context.diagnostics) {
                // Only handle our diagnostics
                if (diagnostic.source !== 'HighDupe') {
                    continue;
                }

                // Only handle duplicate-word issues
                if (diagnostic.code !== 'duplicate-word') {
                    continue;
                }

                // Find the corresponding result
                const result = results.find(r =>
                    r.range.isEqual(diagnostic.range) &&
                    r.issueType === 'duplicate-word'
                );

                if (!result) {
                    continue;
                }

                const word = result.text.toLowerCase();

                // Skip if we've already added actions for this word
                if (wordsProcessed.has(word)) {
                    continue;
                }
                wordsProcessed.add(word);

                console.log('  Found diagnostic for word:', result.text);
                this.addActionsForWord(actions, word, result, documentUri, diagnostic);
            }
        } else {
            // Fallback: find results that intersect with the range
            console.log('  No diagnostics in context, using range-based detection');
            for (const result of results) {
                // Only handle duplicate-word issues
                if (result.issueType !== 'duplicate-word') {
                    continue;
                }

                // Check if the result range contains the cursor position or overlaps with the selection
                const intersects = result.range.intersection(range) !== undefined;
                const containsStart = result.range.contains(range.start);
                const containsEnd = result.range.contains(range.end);

                if (intersects || containsStart || containsEnd) {
                    const word = result.text.toLowerCase();

                    // Skip if we've already added actions for this word
                    if (wordsProcessed.has(word)) {
                        continue;
                    }
                    wordsProcessed.add(word);

                    console.log('  Found range-based result for word:', result.text);
                    this.addActionsForWord(actions, word, result, documentUri);
                }
            }
        }

        console.log('  Returning', actions.length, 'code actions');
        return actions;
    }

    /**
     * Helper method to add actions for a word
     */
    private addActionsForWord(
        actions: vscode.CodeAction[],
        word: string,
        result: any,
        documentUri: string,
        diagnostic?: vscode.Diagnostic
    ): void {
        // Action 1: Add to global exclude list
        const addToGlobalAction = new vscode.CodeAction(
            `Add "${word}" to global exclude list`,
            vscode.CodeActionKind.QuickFix
        );
        addToGlobalAction.command = {
            title: `Add "${word}" to global exclude list`,
            command: 'highdupe.addToGlobalExcludeList',
            arguments: [word]
        };
        if (diagnostic) {
            addToGlobalAction.diagnostics = [diagnostic];
        }
        addToGlobalAction.isPreferred = false;
        actions.push(addToGlobalAction);

        // Action 2: Add to project exclude list
        const addToProjectAction = new vscode.CodeAction(
            `Add "${word}" to project exclude list`,
            vscode.CodeActionKind.QuickFix
        );
        addToProjectAction.command = {
            title: `Add "${word}" to project exclude list`,
            command: 'highdupe.addToProjectExcludeList',
            arguments: [word]
        };
        if (diagnostic) {
            addToProjectAction.diagnostics = [diagnostic];
        }
        addToProjectAction.isPreferred = false;
        actions.push(addToProjectAction);

        // Action 3: Ignore this instance
        const ignoreInstanceAction = new vscode.CodeAction(
            `Ignore this instance of "${word}"`,
            vscode.CodeActionKind.QuickFix
        );
        ignoreInstanceAction.command = {
            title: `Ignore this instance of "${word}"`,
            command: 'highdupe.ignoreInstance',
            arguments: [
                documentUri,
                result.range.start.line,
                result.range.start.character,
                word
            ]
        };
        if (diagnostic) {
            ignoreInstanceAction.diagnostics = [diagnostic];
        }
        ignoreInstanceAction.isPreferred = true;
        actions.push(ignoreInstanceAction);
    }
}
