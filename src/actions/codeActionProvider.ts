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

        const actions: vscode.CodeAction[] = [];

        // Find all check results that intersect with the current range or contain the cursor
        for (const result of results) {
            // Check if the result range contains the cursor position or overlaps with the selection
            const intersects = result.range.intersection(range) !== undefined;
            const containsStart = result.range.contains(range.start);
            const containsEnd = result.range.contains(range.end);

            if (intersects || containsStart || containsEnd) {
                console.log('  Found matching result for word:', result.text);

                // Only provide actions for duplicate-word issues
                if (result.issueType === 'duplicate-word') {
                    const word = result.text.toLowerCase();

                    // Action 1: Add to global exclude list
                    const addToGlobalAction = new vscode.CodeAction(
                        `Add "${word}" to global exclude list`,
                        vscode.CodeActionKind.QuickFix
                    );
                    addToGlobalAction.command = {
                        title: 'Add to global exclude list',
                        command: 'highdupe.addToGlobalExcludeList',
                        arguments: [word]
                    };
                    actions.push(addToGlobalAction);

                    // Action 2: Add to project exclude list
                    const addToProjectAction = new vscode.CodeAction(
                        `Add "${word}" to project exclude list`,
                        vscode.CodeActionKind.QuickFix
                    );
                    addToProjectAction.command = {
                        title: 'Add to project exclude list',
                        command: 'highdupe.addToProjectExcludeList',
                        arguments: [word]
                    };
                    actions.push(addToProjectAction);

                    // Action 3: Ignore this instance
                    const ignoreInstanceAction = new vscode.CodeAction(
                        `Ignore this instance of "${word}"`,
                        vscode.CodeActionKind.QuickFix
                    );
                    ignoreInstanceAction.command = {
                        title: 'Ignore this instance',
                        command: 'highdupe.ignoreInstance',
                        arguments: [
                            documentUri,
                            result.range.start.line,
                            result.range.start.character,
                            word
                        ]
                    };
                    actions.push(ignoreInstanceAction);
                }
            }
        }

        console.log('  Returning', actions.length, 'actions');
        return actions;
    }
}
