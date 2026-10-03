/** Blank lines separate authored paragraphs; single newlines remain line breaks. */
export function paragraphs(text: string | undefined | null): string[] {
  return (text ?? "").replace(/\r\n?/g, "\n").trim()
    .split(/\n(?:[\t ]*\n)+/).map(part => part.trim()).filter(Boolean);
}
