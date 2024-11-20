import * as fs from 'fs';
import * as path from 'path';

export function getExcludedWords(): string[] {
    const filePath = path.join(__dirname, 'excludeWords.json');
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(data);
        return json.excludedWords || [];
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error(`Error reading excludeWords.json: ${error.message}`);
        } else {
            console.error('Unknown error reading excludeWords.json');
        }
        return []; // Fallback to an empty exclusion list
    }
}
function findRepeatedWords(line: string): string[] {
    const excludedWords = getExcludedWords();
    const words = line
        .toLowerCase()
        .match(/\b\w+\b/g)
        ?.filter(word => !excludedWords.includes(word)) || [];

    const repeats = words.filter((word, index) => words.indexOf(word) !== index);
    return Array.from(new Set(repeats)); // Remove duplicates in result
}

export default findRepeatedWords;
