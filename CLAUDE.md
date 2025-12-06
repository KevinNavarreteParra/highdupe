# CLAUDE.md - AI Assistant Development Guide

## Project Overview

**HighDupe** is a Visual Studio Code extension that helps writers identify and fix duplicate words in LaTeX documents. It uses a modular architecture to detect repetitive writing patterns at the paragraph level, with features like continuous checking, incremental analysis, and a status bar indicator.

**Status:** Active development (v0.0.1)
**Language:** TypeScript
**License:** MIT
**Author:** KevinNavarreteParra
**Repository:** https://github.com/KevinNavarreteParra/highdupe

## Architecture Overview

HighDupe uses a **modular plugin architecture** with three main layers:

1. **Extension Layer** (`extension.ts`) - VS Code integration, command registration, lifecycle management
2. **Core Layer** (`core/`) - Executor, type definitions, orchestration logic
3. **Module Layer** (`modules/`) - Individual checker modules (duplicate words, etc.)
4. **Utility Layer** (`utils/`) - Document parsing, shared utilities

This architecture allows for easy addition of new checker modules (e.g., passive voice, adverbs) without modifying core logic.

## Repository Structure

```
highdupe/
├── src/
│   ├── extension.ts                    # Main extension entry point
│   ├── highlighter.ts                  # Legacy duplicate detection (kept for compatibility)
│   ├── excludeWords.json               # Legacy exclusion list (deprecated)
│   ├── core/
│   │   ├── executor.ts                 # Module lifecycle manager and orchestrator
│   │   └── types.ts                    # Central type definitions
│   ├── modules/
│   │   ├── duplicateWordChecker.ts     # Duplicate word detection module
│   │   └── registry.ts                 # Module registration system
│   ├── utils/
│   │   └── documentParser.ts           # LaTeX document parsing logic
│   └── test/
│       └── extension.test.ts           # Extension tests
├── .vscode/
│   ├── launch.json                     # Debug configuration
│   ├── tasks.json                      # Build tasks
│   ├── settings.json                   # Workspace settings
│   └── extensions.json                 # Recommended extensions
├── out/                                # Compiled JavaScript output (git-ignored)
├── node_modules/                       # Dependencies (git-ignored)
├── package.json                        # Extension manifest and dependencies
├── tsconfig.json                       # TypeScript compiler configuration
├── eslint.config.mjs                   # ESLint configuration
├── .gitignore                          # Git ignore patterns
├── README.md                           # User-facing documentation
├── CHANGELOG.md                        # Version history
└── LICENSE                             # MIT License
```

## Tech Stack

- **Language:** TypeScript (ES2022, Node16 module system)
- **Platform:** VS Code Extension API (^1.95.0)
- **Build Tools:**
  - TypeScript Compiler (tsc)
  - ESLint for linting
  - npm scripts for build automation
- **Testing:** @vscode/test-electron with Mocha
- **Utilities:** Node.js crypto module (for paragraph hashing)

## Key Files and Their Purposes

### src/extension.ts
Main extension entry point containing:
- `activate()` function - Initializes executor, registers modules and commands
- Status bar item creation and management
- Configuration loading from VS Code settings
- Command registration:
  - `highdupe.findRepeatedWords` - Manual check trigger
  - `highdupe.toggleChecking` - Toggle continuous checking mode
- Extension lifecycle and cleanup

**Key implementation details:**
- Creates and configures the `Executor` instance
- Registers all modules via `ModuleRegistry.registerAll()`
- Auto-starts continuous checking when LaTeX files are opened
- Listens for configuration changes and reloads settings dynamically
- Updates status bar to show enabled/disabled state and module count

### src/core/executor.ts
The orchestrator that manages checker modules and coordinates checking operations.

**Responsibilities:**
- Module registration and lifecycle management
- Decoration type management (different colors for different issue types)
- Continuous checking with configurable intervals
- **Incremental checking** - Only rechecks changed paragraphs (uses MD5 hashing)
- Caching system to prevent unnecessary rechecks
- Decoration application and hover message generation

**Key methods:**
- `registerModule(module)` - Add a new checker module
- `configure(config)` - Apply configuration to executor and modules
- `startContinuousChecking(editor)` - Begin interval-based checking
- `stopContinuousChecking()` - Stop interval-based checking
- `runChecks(editor)` - Execute all enabled modules (with incremental optimization)
- `clearCache(uri?)` - Clear cached results

**Incremental Checking Algorithm:**
1. Parse document into paragraphs
2. Compute MD5 hash for each paragraph
3. Compare with cached hashes to identify changed paragraphs
4. If paragraph count changed: run full check
5. If only some paragraphs changed: run incremental check on those paragraphs only
6. Merge unchanged cached results with new results
7. Apply decorations only if changes detected (prevents blinking)

### src/core/types.ts
Central type definitions for the entire extension:

**Key interfaces:**
- `Paragraph` - Represents a parsed paragraph (text, startLine, endLine, offsets)
- `DocumentContext` - Document information passed to checker modules
- `CheckResult` - Result of a check (range, message, suggestion, severity, issueType)
- `CheckerModule` - Base interface all modules must implement
- `ModuleSettings` - Configuration structure for modules
- `HighDupeConfiguration` - Global extension configuration

**Issue types supported:**
- `duplicate-word` (yellow wavy underline)
- `passive-voice` (green wavy underline) - future
- `adverb` (blue wavy underline) - future
- `contraction` (blue wavy underline) - future
- `paragraph-length` (purple wavy underline) - future
- `transition-word` (orange wavy underline) - future

### src/modules/duplicateWordChecker.ts
Checker module for detecting duplicate words within paragraphs.

**Features:**
- Paragraph-scope or line-scope detection (configurable)
- Excludes common words (global + project-specific lists)
- Highlights **all instances** of duplicates (not just first)
- LaTeX-aware: skips LaTeX commands, comments, and environments
- Case-insensitive matching
- Hover messages with suggestions

**Configuration:**
- `enabled` - Enable/disable this module
- `scope` - `"line"` or `"paragraph"`
- `excludeWords.global` - Global exclusion list
- `excludeWords.project` - Project-specific exclusions

**Algorithm:**
1. For each paragraph in document context
2. Extract all words using `/\b\w+\b/g`
3. Convert to lowercase and filter excluded words
4. Identify words appearing more than once
5. For each duplicate, find all occurrences using regex
6. Skip LaTeX commands (`\cite{}`, `\textbf{}`, etc.)
7. Skip comment lines and math environments
8. Create `CheckResult` for each occurrence

### src/modules/registry.ts
Central registration point for all checker modules.

**Purpose:**
- Provides a single location to register all available modules
- Makes it easy to add new modules without modifying extension.ts
- Maintains list of available module names

**Usage:**
```typescript
ModuleRegistry.registerAll(executor);
```

**Adding new modules:**
Simply add a new line in `registerAll()`:
```typescript
executor.registerModule(new YourNewChecker());
```

### src/utils/documentParser.ts
Sophisticated LaTeX document parser that creates `DocumentContext` objects.

**Features:**
- File type detection (LaTeX, Markdown, Quarto, RMarkdown, text)
- LaTeX-specific paragraph detection
- Skips non-text content (math, tables, bibliography)
- Preprocesses lines to remove LaTeX commands
- Preserves line numbers for accurate highlighting

**LaTeX Paragraph Detection Rules:**
- Paragraphs separated by blank lines
- Paragraphs separated by `\par` command
- Math environments (`equation`, `align`, etc.) are skipped
- Table environments are skipped
- Bibliography sections are skipped
- Comment-only lines are skipped

**Preprocessing:**
- Removes comments (`% ...`)
- Removes inline math (`$...$`, `$$...$$`)
- Removes citation commands (`\cite{}`, `\autocite{}`, etc.)
- Removes reference commands (`\ref{}`, `\label{}`, etc.)
- Extracts text from formatting commands (`\textbf{text}` → `text`)
- Removes begin/end environment markers

### src/highlighter.ts (Legacy)
Original duplicate detection logic, kept for backward compatibility.

**Status:** Deprecated - functionality moved to `modules/duplicateWordChecker.ts`

**Contains:**
- `findRepeatedWords(line: string)` - Line-based duplicate detection
- `getExcludedWords()` - Reads from `excludeWords.json`

**Note:** This file may be removed in future versions once migration is complete.

## Development Workflows

### Initial Setup
```bash
npm install
```

### Development Cycle
```bash
# Watch mode - automatically recompiles on file changes
npm run watch

# Or compile once
npm run compile

# Run linter
npm run lint

# Run tests
npm test
```

### Testing the Extension
1. Press `F5` in VS Code (or Run > Start Debugging)
2. This launches a new Extension Development Host window
3. Open a `.tex` file to trigger extension activation
4. Extension auto-starts continuous checking for LaTeX files
5. Status bar shows "✓ HighDupe: 1 module" (or number of enabled modules)
6. Click status bar to toggle checking on/off
7. Or use Command Palette:
   - "Find Repeat Words" - Manual check
   - "HighDupe: Toggle Continuous Checking" - Enable/disable auto-checking

### Debug Configuration
The `.vscode/launch.json` is pre-configured for extension debugging:
- Name: "Run Extension"
- Runs pre-launch task (build)
- Opens extension development host
- Enables TypeScript debugging with source maps

## Configuration System

### Available Settings (package.json)

#### `highdupe.checkInterval`
- **Type:** number
- **Default:** 3000 (3 seconds)
- **Range:** 500 - 30000 milliseconds
- **Description:** Interval for running checks in continuous mode

#### `highdupe.modules.duplicateWord.enabled`
- **Type:** boolean
- **Default:** true
- **Description:** Enable/disable duplicate word checking

#### `highdupe.modules.duplicateWord.scope`
- **Type:** string (enum)
- **Values:** `"line"`, `"paragraph"`
- **Default:** `"paragraph"`
- **Description:** Scope for duplicate detection

#### `highdupe.modules.duplicateWord.excludeWords.global`
- **Type:** array of strings
- **Default:** `["the", "and", "a", "of", "to", "in", "is", "it", "that", "for"]`
- **Description:** Global list of words to exclude

#### `highdupe.modules.duplicateWord.excludeWords.project`
- **Type:** array of strings
- **Default:** `[]`
- **Description:** Project-specific exclusions

### Accessing Settings in Code

```typescript
const config = vscode.workspace.getConfiguration('highdupe');
const checkInterval = config.get('checkInterval', 3000);
const enabled = config.get('modules.duplicateWord.enabled', true);
```

### Configuration Loading Flow
1. Extension activates
2. `loadConfiguration()` reads VS Code settings
3. Builds `HighDupeConfiguration` object
4. Calls `executor.configure(config)`
5. Executor applies settings to each registered module
6. Configuration listener watches for changes and reloads

## TypeScript Configuration

### Compiler Options (tsconfig.json)
- **Module:** Node16
- **Target:** ES2022
- **Output:** `./out` directory
- **Strict mode:** Enabled
- **Source maps:** Enabled for debugging
- **ES Module Interop:** Enabled

### Important Settings
- `rootDir`: `src` - All source files must be in src/
- `outDir`: `./out` - Compiled JS goes here
- Excludes: `node_modules`, `.vscode-test`

## Code Style and Conventions

### ESLint Rules (eslint.config.mjs)
- **Naming convention:** camelCase or PascalCase for imports
- **Curly braces:** Required for control structures
- **Equality:** Prefer `===` over `==`
- **Semicolons:** Required
- **No throw literals:** Must throw Error objects

### TypeScript Patterns
- Use explicit type annotations for public APIs
- Implement interfaces for checker modules
- Proper error handling with type guards (`error instanceof Error`)
- Export interfaces and types from `core/types.ts`
- Use readonly for immutable properties

### File Organization
- **core/** - Core orchestration logic (executor, types)
- **modules/** - Individual checker modules (each in its own file)
- **utils/** - Shared utilities (document parsing, helpers)
- **test/** - Test files mirroring src structure
- Configuration files in root or appropriate directories

### Module Development Pattern
To create a new checker module:

1. Create file in `src/modules/yourChecker.ts`
2. Implement `CheckerModule` interface from `core/types.ts`
3. Define module-specific settings interface extending `ModuleSettings`
4. Implement `check(context: DocumentContext): CheckResult[]`
5. Implement `configure(settings: ModuleSettings): void`
6. Register in `modules/registry.ts`
7. Add configuration schema to `package.json`
8. Add decoration type to `executor.ts` if needed

Example skeleton:
```typescript
import { CheckerModule, CheckResult, DocumentContext, ModuleSettings } from '../core/types';

export class MyChecker implements CheckerModule {
    readonly name = 'my-checker';
    readonly displayName = 'My Checker';
    readonly description = 'Checks for something';
    enabled = true;

    private settings: MyCheckerSettings = {
        enabled: true,
        // ... your settings
    };

    check(context: DocumentContext): CheckResult[] {
        // Your checking logic
        return [];
    }

    configure(settings: ModuleSettings): void {
        this.settings = { ...this.settings, ...settings };
        this.enabled = this.settings.enabled;
    }

    getConfiguration(): ModuleSettings {
        return { ...this.settings };
    }
}
```

## Extension Activation

The extension activates:
- **Trigger:** When a LaTeX file (`.tex`) is opened
- **Configuration:** Set in `package.json` via `activationEvents: ["onLanguage:latex"]`
- **Languages supported:** LaTeX (primary), extensible to Markdown/Quarto
- **Auto-start:** Continuous checking automatically starts for LaTeX files

## Current Features (Implemented)

### ✅ Completed
- Modular architecture with plugin system
- Paragraph-level duplicate detection
- Highlights **all instances** of duplicates (not just first)
- Continuous checking mode with configurable interval
- Status bar indicator with toggle functionality
- Incremental checking (only rechecks changed paragraphs)
- Caching system to prevent unnecessary work
- Configuration via VS Code settings
- Customizable exclude words (global + project)
- LaTeX-aware parsing (skips commands, comments, math, tables, bibliography)
- Hover messages with suggestions
- Manual check command
- Auto-start for LaTeX files

### 🔧 In Progress / Limitations
- Only duplicate word checker implemented (architecture supports more)
- Fixed decoration colors (not user-customizable)
- No phrase detection yet
- No synonym suggestions yet

## Planned Features

### High Priority (Architecture Ready)
- Passive voice detector module
- Adverb detector module
- Contraction detector module
- Paragraph length checker module
- Transition word tracker module

### Medium Priority
- Customizable highlight colors via settings
- Quick fix actions (suggest synonyms, rephrase)
- Multi-line phrase detection
- Cascading highlights for multiple issues
- Export check results to file

### Low Priority
- Synonym dictionary integration
- Transition phrase suggestions
- Support for Markdown/Quarto/RMarkdown
- Custom user-defined patterns
- Statistics dashboard

## Making Changes: Guidelines for AI Assistants

### Before Making Changes
1. **Read existing code first** - Always use Read tool before editing
2. **Understand the architecture** - Know which layer you're modifying (extension/core/module/util)
3. **Check related modules** - Changes in core may affect all modules
4. **Preserve working functionality** - Don't break existing features
5. **Match existing patterns** - Follow established code style and architecture

### When Adding Features

#### Adding a New Checker Module
1. Create new file in `src/modules/yourChecker.ts`
2. Implement `CheckerModule` interface
3. Add settings interface extending `ModuleSettings`
4. Register module in `modules/registry.ts`
5. Add configuration schema to `package.json` contributions
6. Add decoration type to `executor.ts` if new issue type needed
7. Update this CLAUDE.md file
8. Test in Extension Development Host

#### Modifying Core Logic
1. **Executor changes** - Affects all modules, test thoroughly
2. **Type changes** - Update all files that reference changed types
3. **Parser changes** - Test with various LaTeX documents
4. **Configuration changes** - Update package.json schema and loadConfiguration()

#### Adding Configuration Options
1. Add schema to `package.json` → `contributes.configuration.properties`
2. Update type definitions in relevant settings interface
3. Update `loadConfiguration()` in `extension.ts`
4. Update module's `configure()` method if module-specific
5. Test configuration change listener

### When Fixing Bugs
1. **Identify the layer** - Is it extension, core, module, or utility layer?
2. **Check related code** - Bug might span multiple files
3. **Consider edge cases** - LaTeX commands, comments, math environments, etc.
4. **Add error handling** - Use try-catch with proper type guards
5. **Maintain backward compatibility** - Don't break existing configurations
6. **Test incrementally** - Ensure incremental checking still works correctly

### Code Quality Standards
- **No unused code** - Remove debug statements and commented code
- **Proper error handling** - Catch and log errors appropriately
- **Type safety** - Leverage TypeScript's type system fully
- **Clear naming** - Functions and variables should be self-documenting
- **Minimal changes** - Only modify what's necessary
- **Dispose resources** - Always dispose of VS Code resources (decorations, subscriptions)
- **Immutability** - Use readonly for properties that shouldn't change

### Testing Requirements
1. **Compile without errors** - `npm run compile` must succeed
2. **Pass linting** - `npm run lint` must pass
3. **Manual testing** - Test in Extension Development Host
4. **Edge cases:**
   - Empty files
   - Files with only comments
   - Files with only math
   - Long paragraphs (100+ words)
   - Nested LaTeX environments
   - Special characters in text
5. **Performance testing** - Test with large documents (1000+ lines)
6. **Configuration testing** - Test all settings combinations

### Git Workflow
- **Branch naming:** Use Claude's auto-generated branch names starting with `claude/`
- **Commits:** Clear, descriptive messages explaining what and why
- **Push:** Always to the designated Claude branch with retry logic
- **Never force push** unless explicitly requested
- **Commit message format:** Use conventional commits (e.g., "feat:", "fix:", "refactor:")

### File Modification Priority
1. **Edit existing files** - Prefer editing over creating new files
2. **Respect project structure** - New modules in `modules/`, new utils in `utils/`
3. **Update manifests** - package.json when adding settings or commands
4. **Update type definitions** - core/types.ts when adding new interfaces
5. **Maintain .gitignore** - Don't commit build artifacts

### Extension API Best Practices
- Dispose of subscriptions properly via `context.subscriptions`
- Use appropriate decoration types for different issue severities
- Handle missing editor/document gracefully
- Provide user feedback via information messages
- Follow VS Code extension guidelines
- Use `ThemeColor` for status bar colors
- Create markdown hover messages with `MarkdownString`

### Performance Considerations
- **Incremental checking** - Only recheck changed paragraphs
- **Caching** - Use MD5 hashing to detect changes
- **Decoration reapplication** - Skip if nothing changed (prevents blinking)
- **Regex efficiency** - Pre-compile regex patterns in module constructors
- **Timer management** - Clear intervals on deactivation
- **Memory management** - Clear cache when documents close
- **Large documents** - Parser handles documents in streaming fashion

### Debugging Strategies

#### Common Issues
1. **Extension not activating** - Check if .tex file is open
2. **Changes not reflected** - Restart debug session (Ctrl+Shift+F5)
3. **TypeScript errors** - Check `out/` directory for compilation issues
4. **Import errors** - Verify paths and exports are correct
5. **Decorations not appearing** - Check decoration type registration
6. **Incremental checking broken** - Verify paragraph hash computation
7. **Configuration not applying** - Check loadConfiguration() and module.configure()

#### Debug Output
- Console logs appear in Debug Console (not Extension Development Host)
- Extension activation logs show registered modules
- Executor logs show check operations and timing
- Parser logs show paragraph detection
- Configuration logs show loaded settings

#### Debugging Tools
- Set breakpoints in TypeScript files (source maps enabled)
- Use VS Code debugger to step through code
- Inspect `executor` variable in debug console
- Check `context.subscriptions` for proper cleanup
- Monitor decoration cache state
- Watch file system for configuration changes

## Dependencies

### Production Dependencies
None (extension uses only VS Code API and Node.js built-ins)

### Development Dependencies
- @types/vscode - VS Code API type definitions
- @types/mocha - Testing framework types
- @types/node - Node.js type definitions
- TypeScript - Language compiler
- ESLint + TypeScript ESLint - Linting
- @vscode/test-cli - Test runner
- @vscode/test-electron - Test environment

## Build Output

### Compilation
- Input: `src/**/*.ts`
- Output: `out/**/*.js`
- Source maps: `out/**/*.js.map`
- Entry point: `out/extension.js` (specified in package.json)

### Directory Structure (out/)
```
out/
├── extension.js
├── highlighter.js
├── excludeWords.json (copied)
├── core/
│   ├── executor.js
│   └── types.js
├── modules/
│   ├── duplicateWordChecker.js
│   └── registry.js
└── utils/
    └── documentParser.js
```

### Ignored Files (.gitignore)
```
out/
dist/
node_modules/
.vscode-test/
*.vsix
```

## Publishing (Future)

When ready to publish:
1. Update version in package.json
2. Update CHANGELOG.md with all changes
3. Update README.md with new features
4. Run `npm run compile` to verify build
5. Run `npm run lint` to verify code quality
6. Test thoroughly in Extension Development Host
7. Run `npm run vscode:prepublish`
8. Package with `vsce package`
9. Publish with `vsce publish`

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Decoration API](https://code.visualstudio.com/api/references/vscode-api#TextEditorDecorationType)
- [Configuration API](https://code.visualstudio.com/api/references/vscode-api#WorkspaceConfiguration)

## FAQ for AI Assistants

### Q: How do I add a new checker module?
A: See "Adding a New Checker Module" in the "Making Changes" section above. Follow the module development pattern.

### Q: Where are duplicate words detected?
A: In `src/modules/duplicateWordChecker.ts`, which implements the `CheckerModule` interface.

### Q: How does incremental checking work?
A: The `Executor` computes MD5 hashes of paragraphs and compares with cached hashes. Only changed paragraphs are rechecked. See `runChecks()` in `executor.ts`.

### Q: Can I add support for Markdown?
A: Yes. The `DocumentParser` already detects Markdown files. You'd need to implement Markdown-specific paragraph parsing in `parseGenericParagraphs()` or create `parseMarkdownParagraphs()`.

### Q: How do I change decoration colors?
A: Modify `initializeDecorationTypes()` in `executor.ts`. Note: This is hardcoded currently; making it user-configurable requires adding settings and updating the configuration system.

### Q: Why are there two duplicate detection implementations?
A: `highlighter.ts` is legacy code from the initial version. The new implementation is in `modules/duplicateWordChecker.ts`. The legacy file may be removed in future versions.

### Q: How do I test my changes?
A: Press F5 to launch Extension Development Host, open a .tex file, and verify behavior. Check Debug Console for logs.

### Q: What's the difference between `scope: "line"` and `scope: "paragraph"`?
A: Line scope checks for duplicates within single lines only. Paragraph scope checks across all lines in a paragraph (more useful for catching repetition).

### Q: How do I add a new exclude word?
A: Users can add words via settings: `highdupe.modules.duplicateWord.excludeWords.global` or `.project`. Don't modify the hardcoded `DEFAULT_EXCLUDE_WORDS` unless necessary.

---

**Last Updated:** 2025-12-06
**Extension Version:** 0.0.1
**VS Code API Version:** ^1.95.0
**Architecture Version:** 2.0 (Modular)
