/**
 * Semantic versioning utilities for comparing version strings
 * Supports basic semver format: MAJOR.MINOR.PATCH
 */

export type SemanticVersion = {
  major: number;
  minor: number;
  patch: number;
  original: string;
};

/**
 * Parse a version string into components
 * @param version - Version string (e.g., "1.2.3" or "v1.2.3")
 * @returns Parsed version object or null if invalid
 */
export function parseVersion(version: string): SemanticVersion | null {
  // Remove 'v' prefix if present
  const cleaned = version.trim().replace(/^v/, '');
  
  // Match MAJOR.MINOR.PATCH pattern
  const match = cleaned.match(/^(\d+)\.(\d+)\.(\d+)$/);
  
  if (!match) {
    return null;
  }
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    original: version
  };
}

/**
 * Compare two version strings
 * @param a - First version
 * @param b - Second version
 * @returns -1 if a < b, 0 if a === b, 1 if a > b, null if either version is invalid
 */
export function compareVersions(a: string, b: string): number | null {
  const versionA = parseVersion(a);
  const versionB = parseVersion(b);
  
  if (!versionA || !versionB) {
    return null;
  }
  
  // Compare major version
  if (versionA.major !== versionB.major) {
    return versionA.major > versionB.major ? 1 : -1;
  }
  
  // Compare minor version
  if (versionA.minor !== versionB.minor) {
    return versionA.minor > versionB.minor ? 1 : -1;
  }
  
  // Compare patch version
  if (versionA.patch !== versionB.patch) {
    return versionA.patch > versionB.patch ? 1 : -1;
  }
  
  return 0;
}

/**
 * Check if version A is greater than version B
 */
export function isVersionGreater(a: string, b: string): boolean {
  const result = compareVersions(a, b);
  return result === 1;
}

/**
 * Check if version A is less than version B
 */
export function isVersionLess(a: string, b: string): boolean {
  const result = compareVersions(a, b);
  return result === -1;
}

/**
 * Check if version A is equal to version B
 */
export function isVersionEqual(a: string, b: string): boolean {
  const result = compareVersions(a, b);
  return result === 0;
}

/**
 * Check if version A is greater than or equal to version B
 */
export function isVersionGreaterOrEqual(a: string, b: string): boolean {
  const result = compareVersions(a, b);
  return result === 1 || result === 0;
}

/**
 * Check if version A is less than or equal to version B
 */
export function isVersionLessOrEqual(a: string, b: string): boolean {
  const result = compareVersions(a, b);
  return result === -1 || result === 0;
}
