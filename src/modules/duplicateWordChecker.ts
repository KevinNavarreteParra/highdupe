import * as vscode from 'vscode';
import { CheckerModule, CheckResult, DocumentContext, ModuleSettings } from '../core/types';

/**
 * Settings for the Duplicate Word Checker
 */
interface DuplicateWordSettings extends ModuleSettings {
    enabled: boolean;
    scope: 'line' | 'paragraph';
    excludeWords: {
        global: string[];
        project: string[];
    };
}

/**
 * Default words to exclude from duplicate detection
 * These are common words that are naturally repeated in writing
 */
const DEFAULT_EXCLUDE_WORDS = [
    'the', 'and', 'a', 'of', 'to', 'in', 'is', 'it', 'that', 'for',
    'as', 'with', 'on', 'at', 'by', 'from', 'or', 'an', 'be', 'this',
    'was', 'are', 'have', 'has', 'had', 'not', 'but', 'can', 'will',
    'if', 'we', 'he', 'she', 'they', 'you', 'i', 'my', 'our', 'your'
];

/**
 * Checker module for detecting duplicate words within paragraphs
 */
export class DuplicateWordChecker implements CheckerModule {
    readonly name = 'duplicate-word';
    readonly displayName = 'Duplicate Word Checker';
    readonly description = 'Detects words that appear multiple times within a paragraph';

    enabled = true;

    private settings: DuplicateWordSettings = {
        enabled: true,
        scope: 'paragraph',
        excludeWords: {
            global: [...DEFAULT_EXCLUDE_WORDS],
            project: []
        }
    };

    /**
     * Get all excluded words (global + project)
     */
    private getExcludedWords(): string[] {
        return [
            ...this.settings.excludeWords.global,
            ...this.settings.excludeWords.project
        ];
    }

    /**
     * Check for duplicate words in the document
     */
    check(context: DocumentContext): CheckResult[] {
        const results: CheckResult[] = [];

        // Check each paragraph
        for (const paragraph of context.paragraphs) {
            const duplicates = this.findDuplicatesInText(paragraph.text);

            // For each duplicate word, find all occurrences in the paragraph
            for (const duplicateWord of duplicates) {
                const occurrences = this.findAllOccurrences(
                    paragraph.text,
                    duplicateWord,
                    context.document,
                    paragraph.startLine,
                    paragraph.endLine
                );

                results.push(...occurrences);
            }
        }

        return results;
    }

    /**
     * Find all duplicate words in a text
     */
    private findDuplicatesInText(text: string): string[] {
        const excludedWords = this.getExcludedWords();

        // Extract all words
        const words = text
            .toLowerCase()
            .match(/\b\w+\b/g) || [];

        // Filter out excluded words
        const filteredWords = words.filter(word => !excludedWords.includes(word));

        // Find duplicates
        const wordCounts = new Map<string, number>();
        for (const word of filteredWords) {
            wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }

        // Return words that appear more than once
        const duplicates: string[] = [];
        for (const [word, count] of wordCounts.entries()) {
            if (count > 1) {
                duplicates.push(word);
            }
        }

        return duplicates;
    }

    /**
     * Find all occurrences of a word in a paragraph and create CheckResults
     * Now properly respects paragraph boundaries from DocumentContext
     */
    private findAllOccurrences(
        paragraphText: string,
        word: string,
        document: vscode.TextDocument,
        startLine: number,
        endLine: number
    ): CheckResult[] {
        const results: CheckResult[] = [];
        const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');

        // Search through the paragraph's line range
        for (let currentLine = startLine; currentLine <= endLine && currentLine < document.lineCount; currentLine++) {
            const line = document.lineAt(currentLine);
            const lineText = line.text;

            // Skip comment lines
            if (lineText.trim().startsWith('%')) {
                continue;
            }

            // Skip lines with table or math environments
            if (lineText.includes('\\begin{equation}') ||
                lineText.includes('\\begin{align}') ||
                lineText.includes('\\begin{table}') ||
                lineText.includes('$$')) {
                continue;
            }

            // Reset regex
            regex.lastIndex = 0;

            // Find all matches in this line
            let match: RegExpExecArray | null;
            while ((match = regex.exec(lineText)) !== null) {
                const matchText = match[0];
                const startChar = match.index;
                const endChar = startChar + matchText.length;

                // Skip if this match is part of a LaTeX command
                if (this.isPartOfLatexCommand(lineText, startChar, endChar)) {
                    continue;
                }

                // Additional check: don't highlight inside comments (mid-line)
                const beforeMatch = lineText.substring(0, startChar);
                if (beforeMatch.includes('%') && !beforeMatch.includes('\\%')) {
                    // This match is after a comment character, skip it
                    continue;
                }

                const range = new vscode.Range(
                    currentLine,
                    startChar,
                    currentLine,
                    endChar
                );

                results.push({
                    range,
                    message: `Duplicate word: "${matchText}"`,
                    suggestion: 'Consider using a synonym or rephrasing to avoid repetition.',
                    severity: 'warning',
                    issueType: 'duplicate-word',
                    text: matchText
                });
            }
        }

        return results;
    }

    /**
     * Check if a match is part of a LaTeX command
     * Returns true if the match should be skipped
     */
    private isPartOfLatexCommand(lineText: string, startChar: number, endChar: number): boolean {
        // Check if preceded by backslash (part of a command name)
        // e.g., \autocite, \textcite, \ac
        if (startChar > 0 && lineText[startChar - 1] === '\\') {
            return true;
        }

        // Check if inside \begin{...} or \end{...}
        // Look backwards for \begin{ or \end{
        const beforeMatch = lineText.substring(0, startChar);
        const lastBegin = beforeMatch.lastIndexOf('\\begin{');
        const lastEnd = beforeMatch.lastIndexOf('\\end{');

        if (lastBegin > lastEnd && lastBegin !== -1) {
            // We're potentially inside a \begin{...}
            const afterBegin = lineText.substring(lastBegin);
            const closingBrace = afterBegin.indexOf('}');
            if (closingBrace > 0 && closingBrace > (startChar - lastBegin)) {
                // The match is inside the \begin{...} environment name
                return true;
            }
        }

        if (lastEnd > lastBegin && lastEnd !== -1) {
            // We're potentially inside an \end{...}
            const afterEnd = lineText.substring(lastEnd);
            const closingBrace = afterEnd.indexOf('}');
            if (closingBrace > 0 && closingBrace > (startChar - lastEnd)) {
                // The match is inside the \end{...} environment name
                return true;
            }
        }

        // Check if inside a command's braces: \command{match}
        // Look for \word{ pattern before the match
        const commandPattern = /\\[a-zA-Z]+\{[^}]*$/;
        const textBeforeMatch = lineText.substring(0, startChar);
        if (commandPattern.test(textBeforeMatch)) {
            // Check if there's a closing brace after the match
            const textAfterMatch = lineText.substring(endChar);
            if (textAfterMatch.indexOf('}') !== -1 && textAfterMatch.indexOf('}') < textAfterMatch.indexOf('{')) {
                // We're inside \command{...}
                return true;
            }
        }

        return false;
    }

    /**
     * Escape special regex characters
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Configure the module
     */
    configure(settings: ModuleSettings): void {
        this.settings = {
            ...this.settings,
            ...settings
        } as DuplicateWordSettings;

        this.enabled = this.settings.enabled;
    }

    /**
     * Get current configuration
     */
    getConfiguration(): ModuleSettings {
        return { ...this.settings };
    }
}
