import Convert from 'ansi-to-html';

const convert = new Convert({
  escapeXML: true,
});

export const colorizeLogs = async (lines: string[]) =>
  await Promise.all(
    lines.map(async (line: string) => {
      try {
        return convert.toHtml(line);
      } catch (_e) {
        return line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
    }),
  );
