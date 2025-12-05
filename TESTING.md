# Testing Guide for HighDupe Phase 1

## Quick Start Testing

### 1. Launch Extension Development Host

1. Open this project in VSCode
2. Press **F5** (or Run > Start Debugging)
3. A new VSCode window will open with the extension loaded

### 2. Open Test File

In the Extension Development Host window:
1. Open the file `test-example.tex` (included in the repository)
2. The extension should automatically activate and start continuous checking
3. After 3 seconds, you should see **yellow wavy underlines** appear under duplicate words

### 3. Expected Behavior

**✓ Should Detect:**
- "some some" in first paragraph
- "Although Although" in first paragraph
- "write write" in first paragraph
- "repeated repeated" in first paragraph
- "the the" in first paragraph
- "has has" in third paragraph
- "appears appears" in third paragraph
- "also also" in third paragraph
- "need need" in third paragraph
- "catch catch" in third paragraph
- "all all" in third paragraph
- "these these" in third paragraph
- "cases cases" in third paragraph
- "bold bold" inside `\textbf{...}`
- "emphasis emphasis" inside `\emph{...}`
- "in in" in formatted text paragraph

**✓ Should NOT Detect (Excluded/Skipped):**
- Common words like "the", "and", "a", "of", "to", "in", "is", "it", "that", "for"
- Words in comments (lines starting with %)
- Words inside math environments (`\begin{equation}...`, `$...$`)
- "equation" repeated in regular text (but should detect if appears >1 time in same paragraph outside exclusion list)
- Words in bibliography section
- Citation commands (`\cite{...}`)

### 4. Test Features

#### Hover Tooltips
- Hover over any yellow underline
- Should see tooltip with:
  - Warning icon (⚠️) + message: "Duplicate word: [word]"
  - Suggestion: "Consider using a synonym or rephrasing to avoid repetition."
  - Metadata: Issue type and matched text

#### Manual Check Command
1. Open Command Palette: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows)
2. Type: "Find Repeat Words"
3. Run the command
4. Should see: "HighDupe: Checks completed" message

#### Toggle Continuous Checking
1. Open Command Palette
2. Type: "HighDupe: Toggle Continuous Checking"
3. Run to disable → Message: "Continuous checking disabled"
4. Underlines should stop updating
5. Run again to re-enable → Message: "Continuous checking enabled"
6. Underlines should resume appearing after edits

#### Configuration Settings
1. Open VSCode Settings (Cmd+, or Ctrl+,)
2. Search for "highdupe"
3. Verify these settings are available:
   - **Check Interval**: Adjust delay (500ms - 30000ms)
   - **Enable Duplicate Word Checking**: Toggle on/off
   - **Scope**: Choose "line" or "paragraph"
   - **Global Exclude Words**: List of words to ignore globally
   - **Project Exclude Words**: Project-specific exclusions

#### Test Configuration Changes
1. In Settings, add "paragraph" to global exclude words
2. Save settings
3. Notice all instances of "paragraph" in test file are no longer flagged
4. Remove "paragraph" from exclude list
5. Duplicates should reappear

## Test Scenarios

### Scenario 1: Writing New Content
1. Add a new paragraph to test file:
   ```latex
   This is a new new paragraph with with duplicate duplicate words.
   ```
2. Wait 3 seconds
3. Yellow underlines should appear under each duplicate

### Scenario 2: Paragraph-Level Detection
1. Write this across multiple lines:
   ```latex
   This paragraph starts with the word "example" on one line.
   And continues with the word example on another line.
   The word example appears three times total.
   ```
2. Should detect "example" appearing 3 times in the same paragraph
3. All 3 instances should be underlined

### Scenario 3: Line vs Paragraph Scope
1. Open Settings → Set scope to "line"
2. Write:
   ```latex
   Line one has the word test.
   Line two also has test.
   ```
3. Should NOT detect (different lines)
4. Change scope back to "paragraph"
5. Should NOW detect (same paragraph)

### Scenario 4: Exclude Words
1. Write: "the the and and a a"
2. Should NOT be flagged (default exclude words)
3. Remove "the" from global exclude list
4. Should now flag "the the"

### Scenario 5: LaTeX Command Handling
1. Write: `\textbf{bold bold text}`
2. Should detect "bold bold" inside the command
3. Write: `\section{Section section Title}`
4. Should detect "section" appearing twice (case-insensitive)

### Scenario 6: Math Environment Skipping
1. Write:
   ```latex
   The equation has solution solution.
   \begin{equation}
   solution = solution + solution
   \end{equation}
   The solution solution is obvious.
   ```
2. Should detect "solution solution" in text paragraphs
3. Should NOT detect "solution" repetitions inside equation environment

### Scenario 7: Comment Skipping
1. Write:
   ```latex
   This paragraph has test test words.
   % This comment also has test test words
   But they should not be flagged in comments.
   ```
2. Should only detect "test test" in actual paragraph
3. Should ignore comment line entirely

## Expected Console Output

Check the Debug Console in the Extension Development Host:

```
HighDupe extension activated!
HighDupe: Registered module 'Duplicate Word Checker'
HighDupe: Configuration loaded { checkInterval: 3000, modules: {...} }
HighDupe: Auto-started continuous checking for LaTeX file
HighDupe: Extension fully activated with 1 modules
HighDupe: Started continuous checking (interval: 3000ms)
```

## Troubleshooting

### No Underlines Appear
- Check console for errors
- Verify file language is "latex" (bottom right of VSCode)
- Verify continuous checking is enabled (run toggle command twice)
- Check if all words are in exclude list

### Wrong Words Flagged
- Check exclude word configuration
- Verify scope setting (line vs paragraph)
- Check if LaTeX commands are being parsed correctly

### Performance Issues
- Increase check interval in settings (e.g., 5000ms)
- Check file size (very large files may be slow)
- Watch for errors in Debug Console

## Success Criteria

Phase 1 is working correctly if:

- ✅ Extension activates automatically for .tex files
- ✅ Yellow underlines appear on duplicate words after interval
- ✅ Hover tooltips show helpful messages and suggestions
- ✅ All instances of duplicates are highlighted (not just first)
- ✅ Paragraph-level detection works across multiple lines
- ✅ Math environments and bibliography are skipped
- ✅ LaTeX command contents are checked
- ✅ Comments are ignored
- ✅ Configuration changes take effect immediately
- ✅ Toggle command enables/disables checking
- ✅ No errors in Debug Console
- ✅ Compilation and linting pass

## Next Steps

Once Phase 1 testing is complete and any issues are fixed, we'll proceed to:

**Phase 2**: Enhanced Duplicate Detection
- Better LaTeX parsing edge cases
- Performance optimizations
- Refined tooltip messages

**Phase 3**: Continuous Checking Improvements
- Incremental checking (only re-check changed paragraphs)
- Status bar indicators
- Performance for large files

**Phase 4**: New Checker Modules
- Transition word overuse
- Adverb detection
- Contraction detection
- Paragraph length (statistical)
- Passive voice detection

---

**Happy Testing! 🎉**
