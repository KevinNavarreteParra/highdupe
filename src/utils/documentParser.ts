import * as vscode from 'vscode';
import { DocumentContext, Paragraph } from '../core/types';

/**
 * Parses documents and creates DocumentContext objects
 */
export class DocumentParser {
    /**
     * Parse a VSCode document into a DocumentContext
     */
    static parseDocument(document: vscode.TextDocument, position?: vscode.Position): DocumentContext {
        const fullText = document.getText();
        const fileType = this.getFileType(document);

        let paragraphs: Paragraph[];

        if (fileType === 'latex') {
            paragraphs = this.parseLatexParagraphs(document);
        } else {
            // For future: markdown, quarto, etc.
            paragraphs = this.parseGenericParagraphs(document);
        }

        return {
            fullText,
            paragraphs,
            document,
            fileType,
            position
        };
    }

    /**
     * Determine the file type from the document
     */
    private static getFileType(document: vscode.TextDocument): string {
        const languageId = document.languageId;

        if (languageId === 'latex' || document.fileName.endsWith('.tex')) {
            return 'latex';
        }
        if (languageId === 'markdown' || document.fileName.endsWith('.md')) {
            return 'markdown';
        }
        if (document.fileName.endsWith('.qmd')) {
            return 'quarto';
        }
        if (document.fileName.endsWith('.Rmd')) {
            return 'rmarkdown';
        }

        return 'text';
    }

    /**
     * Parse LaTeX document into paragraphs
     * Handles: blank lines, \par commands, math environments, comments, bibliography
     */
    private static parseLatexParagraphs(document: vscode.TextDocument): Paragraph[] {
        const paragraphs: Paragraph[] = [];
        const lineCount = document.lineCount;

        // Track environments
        let inMathEnvironment = false;
        let inBibliography = false;

        // Track current paragraph
        let currentParagraph: string[] = [];
        let currentParagraphLines: number[] = [];
        let paragraphStartLine = 0;

        for (let i = 0; i < lineCount; i++) {
            const line = document.lineAt(i).text;

            // Check for bibliography start
            if (line.match(/\\begin\{(bibliography|thebibliography)\}/)) {
                inBibliography = true;
                // End current paragraph before entering bibliography
                if (currentParagraph.length > 0) {
                    this.addParagraph(paragraphs, currentParagraph, currentParagraphLines);
                    currentParagraph = [];
                    currentParagraphLines = [];
                }
                continue;
            }

            // Check for bibliography end
            if (line.match(/\\end\{(bibliography|thebibliography)\}/)) {
                inBibliography = false;
                continue;
            }

            // Skip if in bibliography
            if (inBibliography) {
                continue;
            }

            // Check for math environment start (equation, align, etc.)
            if (line.match(/\\begin\{(equation|align|gather|multline|flalign|alignat)\*?\}/)) {
                inMathEnvironment = true;
                // End current paragraph before entering math
                if (currentParagraph.length > 0) {
                    this.addParagraph(paragraphs, currentParagraph, currentParagraphLines);
                    currentParagraph = [];
                    currentParagraphLines = [];
                }
            }

            // Check for math environment end
            if (line.match(/\\end\{(equation|align|gather|multline|flalign|alignat)\*?\}/)) {
                inMathEnvironment = false;
                continue;
            }

            // Skip if in math environment
            if (inMathEnvironment) {
                continue;
            }

            // Skip comment-only lines
            if (line.trim().startsWith('%')) {
                continue;
            }

            // Process line: remove inline math and comments
            let processedLine = this.preprocessLatexLine(line);

            // Check for paragraph break: blank line or \par command
            const isBlankLine = processedLine.trim() === '';
            const hasParCommand = line.includes('\\par');

            if (isBlankLine || hasParCommand) {
                // End current paragraph if it has content
                if (currentParagraph.length > 0) {
                    this.addParagraph(paragraphs, currentParagraph, currentParagraphLines);
                    currentParagraph = [];
                    currentParagraphLines = [];
                }
            } else {
                // Add line to current paragraph
                if (processedLine.trim().length > 0) {
                    currentParagraph.push(processedLine);
                    currentParagraphLines.push(i);
                }
            }
        }

        // Don't forget the last paragraph
        if (currentParagraph.length > 0) {
            this.addParagraph(paragraphs, currentParagraph, currentParagraphLines);
        }

        return paragraphs;
    }

    /**
     * Helper method to add a paragraph to the list
     */
    private static addParagraph(
        paragraphs: Paragraph[],
        lines: string[],
        lineNumbers: number[]
    ): void {
        if (lines.length === 0 || lineNumbers.length === 0) {
            return;
        }

        const paragraphText = lines.join(' ').trim();
        if (paragraphText.length === 0) {
            return;
        }

        const startLine = lineNumbers[0];
        const endLine = lineNumbers[lineNumbers.length - 1];

        paragraphs.push({
            text: paragraphText,
            startLine,
            endLine,
            startOffset: 0, // These offsets are approximate
            endOffset: paragraphText.length
        });
    }

    /**
     * Preprocess a LaTeX line:
     * - Remove comments (% ...)
     * - Remove inline math ($...$, $$...$$)
     * - Keep macro contents but remove macro syntax
     */
    private static preprocessLatexLine(line: string): string {
        // Remove comments (but not \%)
        line = line.replace(/(?<!\\)%.*$/, '');

        // Remove inline math $...$ (non-greedy)
        line = line.replace(/\$\$.*?\$\$/g, '');
        line = line.replace(/\$.*?\$/g, '');

        // Remove citation commands but keep the key visible for context
        // \cite{key} -> key
        line = line.replace(/\\cite\{([^}]+)\}/g, '');

        // Remove label and ref commands
        line = line.replace(/\\(label|ref|pageref|eqref)\{[^}]+\}/g, '');

        // For text formatting commands, keep only the content
        // \textbf{some words} -> some words
        line = line.replace(/\\(textbf|textit|emph|underline|textsc|texttt)\{([^}]+)\}/g, '$2');

        // Remove section commands but keep titles for now (future: might want to track these)
        // \section{Title} -> Title
        line = line.replace(/\\(chapter|section|subsection|subsubsection|paragraph|subparagraph)\*?\{([^}]+)\}/g, '$2');

        return line;
    }

    /**
     * Parse generic text documents (markdown, plain text)
     * Simple paragraph detection based on blank lines
     */
    private static parseGenericParagraphs(document: vscode.TextDocument): Paragraph[] {
        const paragraphs: Paragraph[] = [];
        const lineCount = document.lineCount;

        let currentParagraph: string[] = [];
        let paragraphStartLine = 0;
        let currentOffset = 0;

        for (let i = 0; i < lineCount; i++) {
            const line = document.lineAt(i).text;

            if (line.trim() === '') {
                // Blank line - end paragraph
                if (currentParagraph.length > 0) {
                    const paragraphText = currentParagraph.join(' ').trim();
                    if (paragraphText.length > 0) {
                        const startOffset = currentOffset;
                        const endOffset = startOffset + paragraphText.length;

                        paragraphs.push({
                            text: paragraphText,
                            startLine: paragraphStartLine,
                            endLine: i - 1,
                            startOffset,
                            endOffset
                        });

                        currentOffset = endOffset + 1;
                    }
                    currentParagraph = [];
                }
                paragraphStartLine = i + 1;
            } else {
                if (currentParagraph.length === 0) {
                    paragraphStartLine = i;
                }
                currentParagraph.push(line);
            }
        }

        // Last paragraph
        if (currentParagraph.length > 0) {
            const paragraphText = currentParagraph.join(' ').trim();
            if (paragraphText.length > 0) {
                paragraphs.push({
                    text: paragraphText,
                    startLine: paragraphStartLine,
                    endLine: lineCount - 1,
                    startOffset: currentOffset,
                    endOffset: currentOffset + paragraphText.length
                });
            }
        }

        return paragraphs;
    }
}
