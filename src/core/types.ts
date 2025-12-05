import * as vscode from 'vscode';

/**
 * Represents a paragraph in the document
 */
export interface Paragraph {
    text: string;
    startLine: number;
    endLine: number;
    startOffset: number;
    endOffset: number;
}

/**
 * Represents a section in the document (e.g., \chapter, \section)
 * Future enhancement - not used in initial implementation
 */
export interface Section {
    title: string;
    level: number; // 1 = chapter, 2 = section, 3 = subsection, etc.
    startLine: number;
    endLine: number;
    paragraphs: Paragraph[];
}

/**
 * Document context provided to checker modules
 */
export interface DocumentContext {
    /** Full document text */
    fullText: string;

    /** Parsed paragraphs */
    paragraphs: Paragraph[];

    /** The VSCode document */
    document: vscode.TextDocument;

    /** File type (latex, markdown, etc.) */
    fileType: string;

    /** Current cursor position (if relevant) */
    position?: vscode.Position;
}

/**
 * Result of a check operation
 */
export interface CheckResult {
    /** Range in the document where the issue was found */
    range: vscode.Range;

    /** The issue message/description */
    message: string;

    /** Suggestion for fixing the issue */
    suggestion: string;

    /** Severity level */
    severity: 'error' | 'warning' | 'info';

    /** Type of issue (for decoration purposes) */
    issueType: 'duplicate-word' | 'passive-voice' | 'adverb' | 'contraction' | 'paragraph-length' | 'transition-word';

    /** The text that triggered the issue */
    text: string;
}

/**
 * Settings for a specific module
 */
export interface ModuleSettings {
    /** Whether the module is enabled */
    enabled: boolean;

    /** Module-specific configuration */
    [key: string]: any;
}

/**
 * Base interface for all checker modules
 */
export interface CheckerModule {
    /** Unique identifier for this module */
    readonly name: string;

    /** Human-readable display name */
    readonly displayName: string;

    /** Description of what this module checks */
    readonly description: string;

    /** Whether the module is currently enabled */
    enabled: boolean;

    /**
     * Perform the check on the document
     * @param context The document context to check
     * @returns Array of check results
     */
    check(context: DocumentContext): CheckResult[];

    /**
     * Configure the module with settings
     * @param settings Module-specific settings
     */
    configure(settings: ModuleSettings): void;

    /**
     * Get the current configuration
     */
    getConfiguration(): ModuleSettings;
}

/**
 * Configuration for all modules
 */
export interface HighDupeConfiguration {
    /** Interval in milliseconds for running checks */
    checkInterval: number;

    /** Module-specific configurations */
    modules: {
        [moduleName: string]: ModuleSettings;
    };
}
