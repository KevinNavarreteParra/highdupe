import * as fs from 'fs';

const excludedWords = JSON.parse(fs.readFileSync('./src/excludeWords.json', 'utf-8'));

function findRepeatedWords(line: string): string[] {
    const words = line
        .toLowerCase()
        .match(/\b\w+\b/g)
        ?.filter(word => !excludedWords.includes(word)) || [];

    const repeats = words.filter((word, index) => words.indexOf(word) !== index);
    return Array.from(new Set(repeats)); // Remove duplicates in result
}

export default findRepeatedWords;
