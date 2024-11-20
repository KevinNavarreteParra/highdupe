# highdupe README

NOTE: THIS IS A WORK IN PROGRESS. I'M STILL LEARNING HOW TO MAKE A VS CODE EXTENSION. CURRENTLY, THIS EXTENSION HAS VERY BASIC FUNCTIONALITY.

This is an attempt at creating a VSCode extension that fixes a common issue I have when writing. Often I'll write a word or a transition phrase more than once in a sentence or paragraph, which can be a bad habit--especially how I do it! This extension will hopefully highlight those duplicates while I'm writing so I can fix them without having to work as hard to look for them (because I often miss them when editing and revising).

## Who is this for?

This extension's purpose is for a very specific audience: me. However, if you find yourself with a similar issue, you might find this extension useful. The issue I have is that I often write the same couple words in a sentence or paragraph, leading to a repetitive and boring writing style. I'm particularly bad about transition words and phrases, so this extension will hopefully help me catch those mistakes as I write.

## Features

This extension's main feature will be to highlight words that appear more than once inside one line of a LaTeX document, which you can call using the `Find Repeat Words` command in the command palette (`Cmd+Shift+P` on Mac, `Ctrl+Shift+P` on Windows). This will highlight any words that appear more than once in a line, which you can then fix.

It currently only highlights the first instance of repeated words, but I hope to add more functionality in the future. I'm still learning how to make a VS Code extension, so this is a work in progress. Among the things I'd like to add are:

- Highlighting all instances of repeated words in a line
- Updated ability to add to the `excludeWords` list in the settings
- Ability to change the highlight color
- Ability to have cascading highlights for repeated words (e.g., first instance is highlighted in one color, second instance in another, etc.)
- Automatic refresh that iterates through the document and highlights repeated words within each line
- Updated settings.json file that allows for more customization
- Ability to highlight repeated phrases
- A dictionary that suggests synonyms for certain common words that I often repeat
- A dictionary that suggests synonyms for certain common transition phrases that I often repeat

If you have any suggestions or would like to contribute, please let me know! I'm always happy to learn more and improve my coding skills.

## Requirements

**UPDATE LATER**

## Known Issues

- The extension currently only highlights the first instance of a repeated word in a line. I hope to add functionality to highlight all instances of repeated words in a line in the future.

## Release Notes

### 0.0.1

Initial release of `highdupe`. This extension currently only highlights the first instance of a repeated word in a line.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)
