type InlineStyle = React.CSSProperties | Record<string, string | number | null | undefined> | undefined;

// Merges CSS styles like `classNames` merges CSS classes
export function mergeStyles(...styles: Array<InlineStyle>): InlineStyle {
  let result: InlineStyle = {};

  for (const style of styles) {
    if (style) {
      result = { ...result, ...style };
    }
  }

  return Object.keys(result).length ? result : undefined;
}
