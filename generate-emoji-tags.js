const fs = require('fs');

// Usage
if (process.argv.length < 3) {
    console.error('Usage: node generate-emoji-tags.js <input-emoji.json> [output-file]');
    process.exit(1);
}

const inPath = process.argv[2];
const outPath = process.argv[3] || 'emoji.dict.yaml';

// Words to exclude from tags
const STOPWORDS = new Set(['with', 'and', 'of', 'or', '&', 'in', 'the', 'a', 'an']);

// Priority tags
const PRIORITY = ['Face', 'Keycap', 'Flag', 'Symbol'];

// Unified Hex Code to Emoji String
function unifiedToEmoji(unified) {
    if (!unified) return '';
    try {
        return unified.split('-')
            .map(hex => String.fromCodePoint(parseInt(hex, 16)))
            .join('');
    } catch (e) {
        return '';
    }
}

// Clean and Extract Tags, only [a-zA-Z] are allowed. 
function extractTags(str) {
    if (!str) return [];
    
    const lettersOnly = str.replace(/[^a-zA-Z]/g, ' ');
    
    return lettersOnly.split(/\s+/)
        .filter(s => s.length > 0)
        .map(s => s.toLowerCase())
        .filter(s => !STOPWORDS.has(s))
        // Title Case
        .map(s => s.charAt(0).toUpperCase() + s.slice(1));
}

// Sort Tags
function sortTags(tags) {
    const unique = [...new Set(tags)];

    return unique.sort((a, b) => {
        const idxA = PRIORITY.indexOf(a);
        const idxB = PRIORITY.indexOf(b);
        
        // If both are in priority list, sort by their order in PRIORITY array
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    
        // If only A is priority, it comes first
        if (idxA !== -1) return -1;
        
        // If only B is priority, it comes first
        if (idxB !== -1) return 1;
        
        // Otherwise, standard alphabetical sort
        return a.localeCompare(b);
    });
}

// Main Processing
function processEntries() {
    let data;
    try {
        data = JSON.parse(fs.readFileSync(inPath, 'utf8'));
    } catch (err) {
        console.error(`Error reading file: ${err.message}`);
        process.exit(1);
    }

    const outputLines = [];

    // Helper to add a line to output
    const addLine = (unified, rawSourceTags) => {
        if (!unified || rawSourceTags.length === 0) return;
        
        let processedTags = [];
        rawSourceTags.forEach(source => {
            processedTags.push(...extractTags(source));
        });

        if (processedTags.length === 0) return;

        const finalTags = sortTags(processedTags);
        
        const emoji = unifiedToEmoji(unified);
        
        outputLines.push(`${emoji}\t${finalTags.join(';')}`);
    };

    data.forEach(entry => {
        let rawSources = [];

        if (entry.name) rawSources.push(entry.name);
        if (entry.short_names) rawSources.push(...entry.short_names);
        if (entry.keywords) rawSources.push(...entry.keywords);

        // Add the main emoji entry
        const code = entry.unified || entry.non_qualified;
        addLine(code, rawSources);

        if (entry.skin_variations) {
            Object.values(entry.skin_variations).forEach(variant => {
                addLine(variant.unified, rawSources);
            });
        }
    });

    // Write Output
    try {
        fs.writeFileSync(outPath, outputLines.join('\n'), 'utf8');
        console.log(`Successfully wrote ${outputLines.length} lines to ${outPath}`);
    } catch (err) {
        console.error(`Error writing file: ${err.message}`);
    }
}

processEntries();