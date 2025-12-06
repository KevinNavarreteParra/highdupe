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
    ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
        const documentUri = document.uri.toString();
        const results = this.checkResults.get(documentUri);

        console.log('HighDupe CodeActionProvider: provideCodeActions called');
        console.log('  Document URI:', documentUri);
        console.log('  Range:', range);
        console.log('  Results count:', results?.length || 0);

        if (!results || results.length === 0) {
            return [];
        }

        const actions: (vscode.CodeAction | vscode.Command)[] = [];
        const wordsProcessed = new Set<string>(); // Track words we've already added actions for

        // Find all check results that intersect with the current range or contain the cursor
        for (const result of results) {
            // Check if the result range contains the cursor position or overlaps with the selection
            const intersects = result.range.intersection(range) !== undefined;
            const containsStart = result.range.contains(range.start);
            const containsEnd = result.range.contains(range.end);

            if (intersects || containsStart || containsEnd) {
                // Only provide actions for duplicate-word issues
                if (result.issueType === 'duplicate-word') {
                    const word = result.text.toLowerCase();

                    // Skip if we've already added actions for this word
                    if (wordsProcessed.has(word)) {
                        continue;
                    }
                    wordsProcessed.add(word);

                    console.log('  Found matching result for word:', result.text);

                    // Command 1: Add to global exclude list
                    const addToGlobalCommand: vscode.Command = {
                        title: `Add "${word}" to global exclude list`,
                        command: 'highdupe.addToGlobalExcludeList',
                        arguments: [word]
                    };
                    actions.push(addToGlobalCommand);

                    // Command 2: Add to project exclude list
                    const addToProjectCommand: vscode.Command = {
                        title: `Add "${word}" to project exclude list`,
                        command: 'highdupe.addToProjectExcludeList',
                        arguments: [word]
                    };
                    actions.push(addToProjectCommand);

                    // Command 3: Ignore this instance
                    const ignoreInstanceCommand: vscode.Command = {
                        title: `Ignore this instance of "${word}"`,
                        command: 'highdupe.ignoreInstance',
                        arguments: [
                            documentUri,
                            result.range.start.line,
                            result.range.start.character,
                            word
                        ]
                    };
                    actions.push(ignoreInstanceCommand);
                }
            }
        }

        console.log('  Returning', actions.length, 'actions');
        return actions;
    }
}
