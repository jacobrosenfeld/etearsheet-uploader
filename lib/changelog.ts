/**
 * Changelog parser to extract version information and changes
 */

export type ChangelogEntry = {
  version: string;
  date: string;
  sections: {
    [sectionName: string]: string[];
  };
  rawContent: string;
};

/**
 * Parse CHANGELOG.md content and extract version entries
 * @param changelogContent - Raw content of CHANGELOG.md file
 * @returns Array of changelog entries, sorted by version (newest first)
 */
export function parseChangelog(changelogContent: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  
  // Split by version headers (## [X.Y.Z] - YYYY-MM-DD)
  const versionRegex = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})$/gm;
  
  let match;
  const versionMatches: Array<{ version: string; date: string; index: number }> = [];
  
  while ((match = versionRegex.exec(changelogContent)) !== null) {
    versionMatches.push({
      version: match[1],
      date: match[2],
      index: match.index
    });
  }
  
  // Extract content for each version
  for (let i = 0; i < versionMatches.length; i++) {
    const current = versionMatches[i];
    const next = versionMatches[i + 1];
    
    const startIndex = current.index;
    const endIndex = next ? next.index : changelogContent.length;
    
    const versionContent = changelogContent.substring(startIndex, endIndex);
    
    // Parse sections (### Added, ### Changed, etc.)
    const sections: { [key: string]: string[] } = {};
    const sectionRegex = /^### (.+)$/gm;
    const sectionMatches: Array<{ name: string; index: number }> = [];
    
    let sectionMatch;
    while ((sectionMatch = sectionRegex.exec(versionContent)) !== null) {
      sectionMatches.push({
        name: sectionMatch[1],
        index: sectionMatch.index
      });
    }
    
    // Extract items for each section
    for (let j = 0; j < sectionMatches.length; j++) {
      const currentSection = sectionMatches[j];
      const nextSection = sectionMatches[j + 1];
      
      const sectionStart = currentSection.index;
      const sectionEnd = nextSection ? nextSection.index : versionContent.length;
      const sectionContent = versionContent.substring(sectionStart, sectionEnd);
      
      // Extract bullet points (lines starting with -)
      const items: string[] = [];
      const lines = sectionContent.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ')) {
          items.push(trimmed.substring(2).trim());
        }
      }
      
      if (items.length > 0) {
        sections[currentSection.name] = items;
      }
    }
    
    entries.push({
      version: current.version,
      date: current.date,
      sections,
      rawContent: versionContent
    });
  }
  
  return entries;
}

/**
 * Get a summary of changes for a specific version
 * @param entry - Changelog entry
 * @param maxItems - Maximum number of items to include per section
 * @returns Array of formatted change descriptions
 */
export function getVersionSummary(entry: ChangelogEntry, maxItems: number = 5): string[] {
  const summary: string[] = [];
  
  // Prioritize sections
  const sectionOrder = ['Added', 'Changed', 'Fixed', 'Security', 'Deprecated', 'Removed'];
  
  for (const sectionName of sectionOrder) {
    const items = entry.sections[sectionName];
    if (items && items.length > 0) {
      const displayItems = items.slice(0, maxItems);
      for (const item of displayItems) {
        // Clean up the item text (remove markdown formatting)
        const cleanItem = item
          .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
          .replace(/`(.+?)`/g, '$1') // Remove code blocks
          .substring(0, 200); // Limit length
        
        summary.push(`${sectionName}: ${cleanItem}`);
      }
    }
  }
  
  return summary;
}

/**
 * Get a concise title/description for a version
 * @param entry - Changelog entry
 * @returns Short description of the version
 */
export function getVersionTitle(entry: ChangelogEntry): string {
  // Try to find the most significant change
  if (entry.sections['Added'] && entry.sections['Added'].length > 0) {
    const firstAdded = entry.sections['Added'][0];
    // Extract just the feature name (before the colon if present)
    const match = firstAdded.match(/^([^:]+)/);
    if (match) {
      return match[1].trim();
    }
    return firstAdded.substring(0, 50);
  }
  
  if (entry.sections['Changed'] && entry.sections['Changed'].length > 0) {
    return entry.sections['Changed'][0].substring(0, 50);
  }
  
  if (entry.sections['Fixed'] && entry.sections['Fixed'].length > 0) {
    return `Bug fixes in v${entry.version}`;
  }
  
  return `Version ${entry.version}`;
}
