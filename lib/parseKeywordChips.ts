export type MessageSegment =
  | { type: 'text'; value: string }
  | { type: 'keyword'; value: string };

export function parseKeywordChips(content: string): MessageSegment[] {
  return content.split(/(\[\[.+?\]\])/).map((part): MessageSegment => {
    if (part.startsWith('[[') && part.endsWith(']]') && part.length > 4) {
      return { type: 'keyword', value: part.slice(2, -2) };
    }
    return { type: 'text', value: part };
  });
}
