# CLAUDE.md - AI Assistant Development Guide

## Project Overview

**HighDupe** is a Visual Studio Code extension that helps writers identify and fix duplicate words in LaTeX documents. It's designed to catch repetitive writing patterns, particularly with transition words and phrases, by highlighting duplicate words within single lines of text.

**Status:** Work in progress (v0.0.1)
**Language:** TypeScript
**License:** MIT
**Author:** KevinNavarreteParra
**Repository:** https://github.com/KevinNavarreteParra/highdupe

## Repository Structure

```
highdupe/
├── src/
│   ├── extension.ts          # Main extension entry point and activation logic
│   ├── highlighter.ts        # Core duplicate word detection logic
│   ├── excludeWords.json     # List of common words to exclude from duplicate detection
│   └── test/
│       └── extension.test.ts # Extension tests
├── .vscode/
│   ├── launch.json           # Debug configuration for extension development
│   ├── tasks.json            # Build tasks (npm watch)
│   ├── settings.json         # VSCode workspace settings
│   └── extensions.json       # Recommended extensions for development
├── out/                      # Compiled JavaScript output (git-ignored)
├── node_modules/             # Dependencies (git-ignored)
├── package.json              # Extension manifest and dependencies
├── tsconfig.json             # TypeScript compiler configuration
├── eslint.config.mjs         # ESLint configuration
├── .gitignore                # Git ignore patterns
├── README.md                 # User-facing documentation
├── CHANGELOG.md              # Version history
└── LICENSE                   # MIT License
```

## Tech Stack

- **Language:** TypeScript (ES2022, Node16 module system)
- **Platform:** VS Code Extension API (^1.95.0)
- **Build Tools:**
  - TypeScript Compiler (tsc)
  - ESLint for linting
  - npm scripts for build automation
- **Testing:** @vscode/test-electron with Mocha

## Key Files and Their Purposes

### src/extension.ts
The main extension entry point containing:
- `activate()` function - Called when extension is activated (on LaTeX file open)
- Document highlight provider registration for inline highlighting
- Command registration for `highdupe.findRepeatedWords` command
- Extension lifecycle management

**Key implementation details:**
- Registers a `DocumentHighlightProvider` for LaTeX files
- Analyzes line-by-line when cursor position changes
- Shows information message with detected repeated words via command palette

### src/highlighter.ts
Core duplicate detection logic containing:
- `findRepeatedWords(line: string): string[]` - Main detection function
- `getExcludedWords(): string[]` - Loads exclusion list from JSON
- Word extraction using regex: `/\b\w+\b/g`
- Case-insensitive comparison (converts to lowercase)
- Returns unique list of duplicated words

**Algorithm:**
1. Load excluded words from excludeWords.json
2. Extract all words from line using regex
3. Convert to lowercase for comparison
4. Filter out excluded words
5. Find words that appear more than once
6. Return unique duplicates

### src/excludeWords.json
JSON file containing common words to ignore:
```json
{
  "excludedWords": ["the", "and", "a", "of", "to"]
}
```

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
4. Use `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows) and run "Find Repeat Words"

### Debug Configuration
The `.vscode/launch.json` is pre-configured for extension debugging:
- Name: "Run Extension"
- Runs pre-launch task (build)
- Opens extension development host
- Enables TypeScript debugging with source maps

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
- Use explicit type annotations where helpful
- Proper error handling with type guards (`error instanceof Error`)
- Export functions that may be useful elsewhere
- Default exports for main module functions

### File Organization
- Keep related functionality together
- Separate concerns (extension.ts vs highlighter.ts)
- Configuration files in JSON format
- Tests in `src/test/` directory

## Extension Activation

The extension activates:
- **Trigger:** When a LaTeX file (`.tex`) is opened
- **Configuration:** Set in `package.json` via `activationEvents: ["onLanguage:latex"]`
- **Languages supported:** LaTeX only

## Current Limitations

1. Only highlights **first instance** of repeated words (known limitation)
2. Line-by-line detection only (no cross-line or paragraph analysis)
3. Simple word matching (no phrase detection yet)
4. Limited excluded words list
5. No customizable highlight colors
6. No automatic/continuous scanning mode

## Planned Features (from README)

- Highlight all instances of repeated words (not just first)
- Dynamic excludeWords list management via settings
- Customizable highlight colors
- Cascading highlights for multiple repetitions
- Automatic refresh/scanning
- Enhanced settings.json customization
- Phrase repetition detection
- Synonym dictionary integration
- Transition phrase suggestions

## Making Changes: Guidelines for AI Assistants

### Before Making Changes
1. **Read existing code first** - Always use Read tool before editing
2. **Understand the context** - Check how the code fits into the larger system
3. **Preserve working functionality** - Don't break existing features
4. **Match existing patterns** - Follow established code style

### When Adding Features
1. **Start with core logic** - Implement in `highlighter.ts` first
2. **Update extension integration** - Modify `extension.ts` to use new features
3. **Update package.json** - Add new commands, settings, or activation events
4. **Test thoroughly** - Use F5 debug mode to verify changes
5. **Update documentation** - README.md should reflect new capabilities

### When Fixing Bugs
1. **Identify the root cause** - Don't just treat symptoms
2. **Check related code** - Bug might span multiple files
3. **Consider edge cases** - Empty strings, special characters, etc.
4. **Add error handling** - Use try-catch with proper type guards
5. **Maintain backward compatibility** - Don't break existing usage

### Code Quality Standards
- **No unused code** - Remove debug statements and commented code
- **Proper error handling** - Catch and log errors appropriately
- **Type safety** - Leverage TypeScript's type system
- **Clear naming** - Functions and variables should be self-documenting
- **Minimal changes** - Only modify what's necessary

### Testing Requirements
1. **Compile without errors** - `npm run compile` must succeed
2. **Pass linting** - `npm run lint` must pass
3. **Manual testing** - Test in Extension Development Host
4. **Edge cases** - Empty files, special characters, long lines

### Git Workflow
- **Branch naming:** Use Claude's auto-generated branch names starting with `claude/`
- **Commits:** Clear, descriptive messages explaining what and why
- **Push:** Always to the designated Claude branch
- **Never force push** unless explicitly requested

### File Modification Priority
1. **Edit existing files** - Prefer editing over creating new files
2. **Respect project structure** - Keep new files in appropriate directories
3. **Update manifests** - package.json, tsconfig.json when adding files
4. **Maintain .gitignore** - Don't commit build artifacts

### Working with excludeWords.json
- Validate JSON syntax when modifying
- Keep words lowercase (matching is case-insensitive)
- Consider common LaTeX commands when adding exclusions
- Sort alphabetically for maintainability
- Keep array format for easy programmatic updates

### Extension API Best Practices
- Dispose of subscriptions properly via `context.subscriptions`
- Use appropriate DocumentHighlightKind (currently Text)
- Handle missing editor/document gracefully
- Provide user feedback via information messages
- Follow VS Code extension guidelines

### Performance Considerations
- Line-by-line processing is lightweight
- Regex matching is fast for single lines
- File I/O (excludeWords.json) happens once on load
- Avoid heavy computation in highlight provider

## Debugging Tips

### Common Issues
1. **Extension not activating** - Check if .tex file is open
2. **Changes not reflected** - Restart debug session (Ctrl+Shift+F5)
3. **TypeScript errors** - Check `out/` directory for compilation issues
4. **Import errors** - Verify paths and exports are correct

### Debug Output
- Console logs appear in Debug Console (not Extension Development Host)
- `console.log()` in extension.ts shows when extension activates
- `console.error()` in highlighter.ts shows file reading errors

### Source Maps
- Enabled in tsconfig.json
- Allows debugging TypeScript directly
- Set breakpoints in .ts files, not .js

## Dependencies

### Production Dependencies
None (extension uses only VS Code API)

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
2. Update CHANGELOG.md
3. Run `npm run vscode:prepublish` (compiles)
4. Package with `vsce package`
5. Publish with `vsce publish`

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Last Updated:** 2025-12-05
**Extension Version:** 0.0.1
**VS Code API Version:** ^1.95.0
