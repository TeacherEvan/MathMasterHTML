// js/problem-manager.js
import { isMobile } from './utils.js';

export class ProblemManager {
    constructor(level) {
        this.level = level;
        this.problems = [];
        this.currentProblemIndex = 0;
        this.currentProblem = null;
    }

    async loadProblems() {
        let problemPath = '';
        switch (this.level) {
            case 'beginner':
                problemPath = 'Assets/Beginner_Lvl/beginner_problems.md';
                break;
            case 'warrior':
                problemPath = 'Assets/Warrior_Lvl/warrior_problems.md';
                break;
            case 'master':
                problemPath = 'Assets/Master_Lvl/master_problems.md';
                break;
            default:
                problemPath = 'Assets/Beginner_Lvl/beginner_problems.md';
        }

        console.log(`📚 Loading problems from: ${problemPath}`);

        try {
            const response = await fetch(problemPath);
            if (!response.ok) {
                throw new Error(`Failed to load problems: ${response.statusText}`);
            }
            const data = await response.text();
            this.problems = this.parseProblemsFromMarkdown(data);
            console.log(`📖 Loaded ${this.problems.length} problems for ${this.level} level`);

            if (this.problems.length > 0) {
                this.currentProblem = this.problems[this.currentProblemIndex];
            } else {
                this.useFallbackProblem();
            }
        } catch (error) {
            console.error('❌ Error loading problems:', error);
            this.useFallbackProblem();
        }
    }

    parseProblemsFromMarkdown(markdownContent) {
        const parsedProblems = [];
        const problemRegex = /(\d+)\.\s+\`([^\`]+)\`\s*\n((?:\s*-[^\n]+\n?)+)/g;
        let match;

        while ((match = problemRegex.exec(markdownContent)) !== null) {
            try {
                const problemText = match[2];
                const stepsText = match[3];
                const steps = stepsText.split('\n')
                    .filter(line => line.trim().startsWith('-'))
                    .map(line => line.trim().replace(/^-\s*/, ''));

                if (steps.length > 0) {
                    parsedProblems.push({
                        problem: problemText,
                        steps: steps,
                    });
                }
            } catch (e) {
                console.error('Error parsing problem:', e);
            }
        }
        console.log(`📚 Parsed ${parsedProblems.length} problems with multi-step solutions`);
        return parsedProblems;
    }

    useFallbackProblem() {
        console.error('❌ No problems found or failed to load. Using fallback problem.');
        this.currentProblem = {
            problem: "4x = 24",
            steps: ["x = 6"]
        };
        this.problems = [this.currentProblem];
    }

    getCurrentProblem() {
        return this.currentProblem;
    }

    nextProblem() {
        this.currentProblemIndex++;
        if (this.currentProblemIndex >= this.problems.length) {
            this.currentProblemIndex = 0;
            console.log('🔄 Looping back to first problem');
        }
        this.currentProblem = this.problems[this.currentProblemIndex];
        return this.currentProblem;
    }
}
