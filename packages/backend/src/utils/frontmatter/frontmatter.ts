import YAML from 'yaml';

export function getFrontmatter(content: string) {
  try {
    if (!content.startsWith('---\n')) {
      return null;
    }

    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\s*$/m;

    const match = content.match(frontmatterRegex);

    if (!match) {
      return null;
    }

    const frontmatter = match[0];

    return YAML.parse(frontmatter.replace(/---/gm, '').trim());
  } catch (error) {
    console.error('Error extracting frontmatter:', error);
    return null;
  }
}
