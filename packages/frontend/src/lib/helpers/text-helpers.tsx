export const limitText = (text: string, limit: number) => (text.length > limit ? <span title={text}>{text.substring(0, limit)}...</span> : text);
