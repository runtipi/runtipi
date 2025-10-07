import YAML from 'yaml';

export function getFrontmatter(content: string) {
  try {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*(?=\n|$)/m;

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
