# HighDupe - Product Roadmap

## Vision Statement

HighDupe is a writing quality assistant for VSCode that helps maintain good writing habits during long-form academic writing. The extension provides real-time, continuous feedback on common writing issues—starting with LaTeX documents and eventually expanding to other markup languages (Quarto, RMarkdown, Markdown).

### Core Principles
1. **Extensible Architecture**: Easy to add new writing checks as independent modules
2. **Set and Forget**: Continuous, unobtrusive checking during writing sessions
3. **Contextual Awareness**: Respect document structure (paragraphs, sections, environments)
4. **Customizable**: Per-project and global configuration options

## Target Use Case

**Primary User**: Academic writers working on dissertations, papers, and long-form documents in VSCode/Positron

**Primary Pain Point**: Repetitive writing patterns and bad habits that slip through during intensive writing sessions (e.g., overusing transition words like "although," passive voice, excessive adverbs)

**Solution**: Real-time highlighting with helpful tooltips, similar to spell-check underlining in MS Word

---

## Architecture Design

### Proposed System Architecture

```
Extension Entry Point (extension.ts)
    ↓
Executor/Orchestrator
    ↓
Module Registry (configured via settings.json)
    ↓
Individual Check Modules (self-contained classes)
    ├── DuplicateWordChecker
    ├── PassiveVoiceChecker (future)
    ├── AdverbChecker (future)
    ├── ContractionChecker (future)
    ├── ParagraphLengthChecker (future)
    └── TransitionWordChecker (future)
```

### Key Components

#### 1. Executor/Orchestrator
- Manages lifecycle of all checker modules
- Runs checks on a configurable interval (every X seconds)
- Coordinates between VSCode API and checker modules
- Aggregates results from all enabled modules
- Manages document decoration (underlines, tooltips)

#### 2. Module Interface
Each checker module implements a common interface:
```typescript
interface CheckerModule {
  name: string;
  enabled: boolean;

  // Main check function
  check(context: DocumentContext): CheckResult[];

  // Configuration
  configure(settings: ModuleSettings): void;

  // Metadata for tooltips/quick fixes
  getDescription(): string;
  getSuggestion(result: CheckResult): string;
}
```

#### 3. Document Context
Abstraction layer for parsing document structure:
```typescript
interface DocumentContext {
  fullText: string;
  paragraphs: Paragraph[];
  sections: Section[]; // future
  currentLine: number;
  fileType: 'latex' | 'markdown' | 'quarto'; // future
}
```

#### 4. Configuration System
Two-tier settings:
- **Global settings**: User-level defaults (`~/.vscode/settings.json`)
- **Workspace settings**: Project-specific overrides (`.vscode/settings.json`)

```json
{
  "highdupe.checkInterval": 3000,
  "highdupe.modules": {
    "duplicateWords": {
      "enabled": true,
      "scope": "paragraph",
      "excludeWords": {
        "global": ["the", "and", "a", "of", "to"],
        "project": ["ISDS", "LaTeX"]
      }
    },
    "passiveVoice": {
      "enabled": false
    }
  }
}
```

---

## Implementation Phases

### Phase 1: Foundation & Framework (Priority 1)
**Goal**: Build extensible architecture that supports multiple checker modules

**Tasks**:
- [ ] Design and implement base `CheckerModule` interface
- [ ] Create `Executor` class to manage module lifecycle
- [ ] Build `DocumentContext` abstraction for paragraph detection
- [ ] Implement configuration system (global + workspace settings)
- [ ] Create module registry system
- [ ] Update extension.ts to use new architecture
- [ ] Refactor existing duplicate detection into first module (`DuplicateWordChecker`)

**Deliverable**: Working framework where new modules can be added by creating a new class and registering it

**Technical Decisions**:
- Use TypeScript classes for modules (better encapsulation)
- Store module registry in a central file (`src/modules/registry.ts`)
- Use VSCode's workspace configuration API for settings
- Paragraph detection: split on blank lines (`\n\n`) in LaTeX

---

### Phase 2: Enhanced Duplicate Detection (Priority 2)
**Goal**: Fix and enhance the duplicate word checker

**Tasks**:
- [ ] Highlight **all instances** of duplicate words (not just first)
- [ ] Implement paragraph-level detection (currently line-level)
- [ ] Add hover tooltips with explanations
- [ ] Support both global and project-specific exclude words
- [ ] Add simple suggestions in tooltips ("Consider using a synonym")
- [ ] Improve word boundary detection (handle LaTeX commands properly)

**Deliverable**: Robust duplicate word detection at paragraph level with helpful tooltips

**Technical Decisions**:
- Use VSCode `DecorationOptions` for underlines (instead of DocumentHighlight)
- Different decoration types for different severities
- Tooltip text includes word count and simple suggestion

---

### Phase 3: Continuous Checking (Priority 3)
**Goal**: Enable "set and forget" real-time checking during writing

**Tasks**:
- [ ] Implement debounced checking (runs every X seconds, configurable)
- [ ] Add document change listeners
- [ ] Optimize performance for large documents
- [ ] Implement incremental checking (only re-check changed paragraphs)
- [ ] Add status bar indicator showing active checks
- [ ] Create enable/disable commands for quick toggling

**Deliverable**: Continuous, performant checking that runs automatically while writing

**Technical Decisions**:
- Default interval: 3 seconds (user-configurable)
- Debounce user input to avoid excessive re-checking
- Cache paragraph boundaries to avoid re-parsing entire document
- Status bar shows: "HighDupe: ✓ 3 modules active"

---

### Phase 4: Additional Checker Modules (Priority 4)
**Goal**: Add new writing quality checks

**Planned Modules** (in order of priority):

#### 4.1 Transition Word Overuse Checker
- Detects excessive use of transition words/phrases within a section
- Configurable word list and threshold
- Example: "Although", "However", "Moreover", "Furthermore"

#### 4.2 Adverb Checker
- Flags words ending in "-ly" that might weaken writing
- Excludes common academic adverbs (e.g., "significantly")
- Suggestion: "Consider using a stronger verb"

#### 4.3 Contraction Checker
- Identifies contractions in academic writing
- Simple detection: words with apostrophes (can't, won't, etc.)
- Suggestion: "Expand contraction for formal writing"

#### 4.4 Paragraph Length Checker
- Warns when paragraphs exceed a configurable length
- Threshold: word count or line count
- Suggestion: "Consider breaking into smaller paragraphs"

#### 4.5 Passive Voice Checker
- Detects passive voice constructions
- Pattern: forms of "to be" + past participle
- Suggestion: "Consider active voice for clarity"

---

## Future Enhancements (Beyond Current Scope)

### Multi-Language Support
- Expand from LaTeX to:
  - Quarto (.qmd)
  - RMarkdown (.Rmd)
  - Markdown (.md)
  - Plain text (.txt)
- Language-specific paragraph/section detection

### Section-Level Checking
- Analyze within LaTeX sections (`\chapter`, `\section`, `\subsection`)
- Check for repetitive patterns across sections
- Section-level exclude words (e.g., technical terms in Methods section)

### Advanced Features
- Threshold settings per module (e.g., "flag after 3 occurrences")
- Severity levels (error, warning, info)
- Quick fix actions (click to apply suggestion)
- Statistics dashboard (word count, issue summary)
- Export reports of common issues
- Machine learning for personalized writing patterns
- Integration with Grammarly-style suggestions

### User Experience
- Different colored underlines per issue type:
  - Yellow: duplicate words
  - Green: passive voice
  - Blue: style suggestions (adverbs, contractions)
  - Purple: structure issues (paragraph length)
- Sidebar panel showing all issues in document
- Ignore/dismiss specific warnings
- Custom regex-based checks via user configuration

---

## Technical Considerations

### Performance
- **Challenge**: Large dissertation files (100+ pages)
- **Solution**:
  - Incremental checking (only changed paragraphs)
  - Configurable check interval
  - Web Workers for heavy parsing (future)
  - Limit scope to visible editor range (future optimization)

### LaTeX-Specific Challenges
- **Math environments**: Should skip `$...$`, `$$...$$`, `\begin{equation}`
- **Comments**: Should skip `%` comment lines
- **Commands**: Should handle `\textbf{word}` vs raw text
- **Citations**: Should skip `\cite{ref}` patterns

### Testing Strategy
- Unit tests for each checker module
- Integration tests for executor
- Fixture files with known issues
- Performance benchmarks for large files

---

## Success Metrics

### Phase 1-3 (MVP)
- [ ] Framework supports adding new modules in <50 lines of code
- [ ] Duplicate detection catches 100% of paragraph-level duplicates
- [ ] Continuous checking runs without noticeable lag (<100ms)
- [ ] Configuration system supports both global and project settings

### Phase 4
- [ ] 5+ active checker modules
- [ ] User can write entire dissertation chapter with continuous checking enabled
- [ ] Tooltips provide actionable suggestions for 80%+ of flagged issues

---

## Open Questions & Decisions Needed

1. **Decoration Strategy**: Should we use different decoration types (underline styles) or colors for different issue types?

2. **Paragraph Boundaries**: In LaTeX, should we consider `\par` commands in addition to blank lines?

3. **Ignore Mechanisms**: How should users ignore false positives?
   - Right-click context menu?
   - Inline comments (e.g., `% highdupe-ignore-next`)?

4. **Module Distribution**: Should modules be:
   - Built-in only?
   - Support third-party modules from extensions marketplace?

5. **LaTeX Environment Handling**: Should we skip checking inside:
   - Math environments?
   - Code listings?
   - Bibliography?

---

## Timeline Estimate

- **Phase 1 (Framework)**: 2-3 weeks development
- **Phase 2 (Enhanced Duplicate Detection)**: 1-2 weeks
- **Phase 3 (Continuous Checking)**: 1-2 weeks
- **Phase 4 (New Modules)**: 1 week per module

**Total MVP (Phases 1-3)**: ~6 weeks
**Full Phase 4**: Additional 4-6 weeks

---

**Last Updated**: 2025-12-05
**Status**: Planning Phase
**Next Step**: Review and approve roadmap, then begin Phase 1 implementation
