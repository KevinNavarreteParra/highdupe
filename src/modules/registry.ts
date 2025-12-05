import { CheckerModule } from '../core/types';
import { Executor } from '../core/executor';
import { DuplicateWordChecker } from './duplicateWordChecker';

/**
 * Module Registry
 * Central location for registering all available checker modules
 */
export class ModuleRegistry {
    /**
     * Register all available modules with the executor
     */
    static registerAll(executor: Executor): void {
        // Register duplicate word checker
        executor.registerModule(new DuplicateWordChecker());

        // Future modules will be registered here:
        // executor.registerModule(new PassiveVoiceChecker());
        // executor.registerModule(new AdverbChecker());
        // executor.registerModule(new ContractionChecker());
        // executor.registerModule(new ParagraphLengthChecker());
        // executor.registerModule(new TransitionWordChecker());
    }

    /**
     * Get list of all available module names
     */
    static getAvailableModules(): string[] {
        return [
            'duplicate-word',
            // Future modules:
            // 'passive-voice',
            // 'adverb',
            // 'contraction',
            // 'paragraph-length',
            // 'transition-word'
        ];
    }
}
