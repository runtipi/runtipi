import Convert from 'ansi-to-html';

const convert = new Convert();

export const colorizeLogs = async (lines: string[]) =>
  await Promise.all(
    lines.map(async (line: string) => {
      try {
        return convert.toHtml(line);
      } catch (e) {
        return line;
      }
    }),
  );
