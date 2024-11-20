import * as vscode from 'vscode';
import findRepeatedWords from './highlighter';

export function activate(context: vscode.ExtensionContext) {
    console.log('HighDupe extension activated!');

    const disposable = vscode.languages.registerDocumentHighlightProvider(
        { language: 'latex', scheme: 'file' },
        {
            provideDocumentHighlights(document, position, token) {
                const lineText = document.lineAt(position.line).text;
                const repeats = findRepeatedWords(lineText);

                return repeats.map((word: string) => {
                    const start = lineText.indexOf(word);
                    const range = new vscode.Range(
                        position.line,
                        start,
                        position.line,
                        start + word.length
                    );
                    return new vscode.DocumentHighlight(range, vscode.DocumentHighlightKind.Text);
                });
            },
        }
    );

    context.subscriptions.push(disposable);

    const commandDisposable = vscode.commands.registerCommand('highdupe.findRepeatedWords', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const lineText = editor.document.lineAt(editor.selection.active.line).text;
            const repeats = findRepeatedWords(lineText);
            vscode.window.showInformationMessage(`Repeated words: ${repeats.join(', ')}`);
        }
    });

    context.subscriptions.push(commandDisposable);
}
