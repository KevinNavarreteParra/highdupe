import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
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
            global: this.loadDefaultExcludedWords(),
            project: []
        }
    };

    /**
     * Load default excluded words from the JSON file
     */
    private loadDefaultExcludedWords(): string[] {
        try {
            const filePath = path.join(__dirname, '..', 'excludeWords.json');
            const data = fs.readFileSync(filePath, 'utf-8');
            const json = JSON.parse(data);
            return json.excludedWords || [];
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error(`Error reading excludeWords.json: ${error.message}`);
            } else {
                console.error('Unknown error reading excludeWords.json');
            }
            return [];
        }
    }

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
                    paragraph.startLine
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
     */
    private findAllOccurrences(
        paragraphText: string,
        word: string,
        document: vscode.TextDocument,
        startLine: number
    ): CheckResult[] {
        const results: CheckResult[] = [];
        const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');

        // We need to find the word in the actual document lines, not just the paragraph text
        // This is because the paragraph text has been preprocessed and may not match exactly

        let currentLine = startLine;
        let match: RegExpExecArray | null;

        // Search through the document starting from the paragraph's start line
        while (currentLine < document.lineCount) {
            const line = document.lineAt(currentLine);
            const lineText = line.text;

            // Reset regex
            regex.lastIndex = 0;

            // Find all matches in this line
            while ((match = regex.exec(lineText)) !== null) {
                const matchText = match[0];
                const startChar = match.index;
                const endChar = startChar + matchText.length;

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

            currentLine++;

            // Check if we've moved beyond the paragraph
            // This is a simple heuristic - if we hit a blank line, we're done
            if (lineText.trim() === '' || lineText.includes('\\par')) {
                break;
            }
        }

        return results;
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
