"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
var vscode = require("vscode");
var highlighter_1 = require("./highlighter");
function activate(context) {
    var disposable = vscode.languages.registerDocumentHighlightProvider({ language: 'latex', scheme: 'file' }, {
        provideDocumentHighlights: function (document, position, token) {
            var lineText = document.lineAt(position.line).text;
            var repeats = (0, highlighter_1.default)(lineText);
            return repeats.map(function (word) {
                var start = lineText.indexOf(word);
                var range = new vscode.Range(position.line, start, position.line, start + word.length);
                return new vscode.DocumentHighlight(range, vscode.DocumentHighlightKind.Text);
            });
        },
    });
    context.subscriptions.push(disposable);
}
