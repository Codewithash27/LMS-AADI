const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

const MARKER_SUFFIX =
  /(?:\*|✓|✔|✅|☑(?:\s*Correct)?|\(correct\)|\[correct\])\s*$/i;

function stripCorrectMarker(text: string): { text: string; marked: boolean } {
  let t = text.trim();
  let marked = false;
  if (MARKER_SUFFIX.test(t)) {
    marked = true;
    t = t.replace(MARKER_SUFFIX, "").trim();
  }
  if (/^\*\s*/.test(t)) {
    marked = true;
    t = t.replace(/^\*\s*/, "").trim();
  }
  return { text: t, marked };
}

function letterIndex(letter: string): number {
  const i = letter.toUpperCase().charCodeAt(0) - 65;
  return i >= 0 && i < 26 ? i : -1;
}

/** Matches start of an option line (not continuation). */
function matchOptionStart(line: string): { index: number; rest: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const optNum = trimmed.match(/^\s*Option\s+(\d+)\s*[.):\-]\s*(.+)$/i);
  if (optNum) {
    const idx = parseInt(optNum[1], 10) - 1;
    if (idx >= 0) return { index: idx, rest: optNum[2] };
    return null;
  }

  const m = trimmed.match(
    /^\s*(?:\(?([A-Za-z])\)?|[([[]?([A-Za-z])[)\]]?)\s*(?:[.):\-]|:\s*|\-\s+)\s*(.+)$/i
  );
  if (!m) return null;
  const letter = m[1] || m[2];
  const idx = letterIndex(letter);
  if (idx < 0) return null;
  return { index: idx, rest: m[3] };
}

function splitInlineOptions(line: string): { parts: string[]; marked: number[] } | null {
  const re = /(?:^|\s)([A-F])\)\s*/g;
  const hits: { letter: string; contentStart: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    hits.push({ letter: m[1], contentStart: m.index + m[0].length });
  }
  if (hits.length < 2) return null;
  for (let i = 0; i < hits.length; i++) {
    if (hits[i].letter !== LETTERS[i]) return null;
  }
  const parts: string[] = [];
  const marked: number[] = [];
  for (let i = 0; i < hits.length; i++) {
    const sliceEnd =
      i + 1 < hits.length ? hits[i + 1].contentStart - hits[i + 1].letter.length - 1 : line.length;
    let chunk = line.slice(hits[i].contentStart, Math.max(hits[i].contentStart, sliceEnd)).trim();
    const { text, marked: isMarked } = stripCorrectMarker(chunk);
    parts.push(text);
    if (isMarked) marked.push(i);
  }
  return { parts, marked };
}

/** PDF/Word often flatten MCQ onto one line — restore breaks before A) / Answer:. */
export function normalizeMcqLineBreaks(block: string): string {
  let t = (block || "").replace(/\r\n/g, "\n");
  t = t.replace(/([^\n])\s+(?=[A-F]\)\s)/gi, "$1\n");
  t = t.replace(/([^\n])\s+(?=Option\s+\d+\s*[.):\-])/gi, "$1\n");
  t = t.replace(
    /([^\n])\s+(?=(?:(?:correct|right|model)\s+)?(?:answer|ans|solution)\s*(?:key)?\s*[:\-–\.])/gi,
    "$1\n"
  );
  return t;
}

/** Remove options / answer key from stem shown to students. */
export function sanitizeQuestionStemForMcq(text: string, options?: string[] | null): string {
  let t = (text || "").replace(/\r\n/g, "\n").trim();
  if (!t) return "";

  t = t.replace(
    /\n?\s*(?:(?:correct|right|model)\s+)?(?:answer|ans|solution)\s*(?:key)?\s*[:\-–\.]\s*[^\n]*/gi,
    ""
  );
  t = t.replace(/^\s*[A-F]\)\s*.+$/gim, "");
  t = t.replace(/^\s*Option\s+\d+\s*[.):\-]\s*.+$/gim, "");

  if ((t.match(/[A-F]\)/gi) || []).length >= 2) {
    t = t.replace(/\s+[A-F]\)\s+.+$/gi, "");
  }

  if (options?.length) {
    for (const opt of options) {
      const trimmed = opt.trim();
      if (trimmed.length < 3) continue;
      const esc = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      t = t.replace(new RegExp(`\\s*${esc}\\s*`, "gi"), " ");
    }
  }

  return t.replace(/\s+/g, " ").trim();
}

function extractAnswerLine(body: string): { answer?: string; rest: string } {
  const lines = body.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    const m = line.match(
      /^(?:(?:correct|right|model)\s+)?(?:answer|ans|solution)\s*(?:key)?\s*[:\-–\.]\s*(.+)$/i
    );
    if (m) {
      const rest = [...lines.slice(0, i), ...lines.slice(i + 1)].join("\n").trim();
      return { answer: m[1].trim(), rest };
    }
  }
  return { rest: body };
}

function resolveAnswerKey(answerRaw: string, options: string[]): number | undefined {
  const t = answerRaw.trim();
  if (!t) return undefined;

  const optN = t.match(/^Option\s+(\d+)\s*$/i);
  if (optN) {
    const idx = parseInt(optN[1], 10) - 1;
    return idx >= 0 && idx < options.length ? idx : undefined;
  }

  const letterOnly = t.match(/^(?:\(?([A-Fa-f])\)?\.?)$/);
  if (letterOnly) {
    const idx = letterIndex(letterOnly[1]);
    return idx >= 0 && idx < options.length ? idx : undefined;
  }

  const lower = t.toLowerCase();
  for (let i = 0; i < options.length; i++) {
    if (options[i].toLowerCase() === lower) return i;
  }
  for (let i = 0; i < options.length; i++) {
    if (options[i].toLowerCase().includes(lower) && lower.length >= 2) return i;
  }
  return undefined;
}

export function parseMcqBlock(block: string): {
  questionText: string;
  options: string[];
  correctOption?: number;
  modelAnswer?: string | null;
} {
  const answerExtract = extractAnswerLine(block);
  let working = answerExtract.rest;

  const lines = working.split("\n");
  const optionTexts: string[] = [];
  let markedIndex = -1;
  const questionLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const colonSplit = line.match(/^(.+?:\s*)(.+)$/);
    let scanLine = line;
    if (colonSplit && /[A-F]\)/.test(colonSplit[2])) {
      questionLines.push(colonSplit[1].replace(/:\s*$/, "").trim());
      scanLine = colonSplit[2];
    }

    const inline = splitInlineOptions(scanLine);
    if (inline && inline.parts.length >= 2) {
      inline.parts.forEach((p, idx) => {
        optionTexts[idx] = p;
      });
      if (inline.marked.length > 0) markedIndex = inline.marked[0];
      i++;
      continue;
    }

    const start = matchOptionStart(scanLine);
    if (start && start.index === optionTexts.length) {
      let text = start.rest;
      const { text: t0, marked } = stripCorrectMarker(text);
      text = t0;
      if (marked) markedIndex = start.index;
      i++;
      while (i < lines.length && !matchOptionStart(lines[i]) && !splitInlineOptions(lines[i])) {
        const cont = lines[i].trim();
        if (cont) text += " " + cont;
        i++;
      }
      optionTexts[start.index] = text.trim();
      continue;
    }

    if (optionTexts.length === 0) {
      questionLines.push(line);
    } else if (optionTexts.length > 0) {
      const last = optionTexts.length - 1;
      optionTexts[last] = (optionTexts[last] + " " + line.trim()).trim();
    }
    i++;
  }

  const indicesOk =
    optionTexts.length >= 2 &&
    optionTexts.every((o, idx) => o != null && o.length > 0);

  if (!indicesOk) {
    return { questionText: block.trim(), options: [] };
  }

  let correctOption = markedIndex >= 0 ? markedIndex : undefined;
  if (answerExtract.answer) {
    const resolved = resolveAnswerKey(answerExtract.answer, optionTexts);
    if (resolved != null) correctOption = resolved;
  }

  let last = optionTexts[optionTexts.length - 1];
  const inlineAns = last.match(/^(.+?)\s+(?:(?:correct|right|model)\s+)?(?:answer|ans)\s*[:\-–\.]\s*(.+)$/i);
  if (inlineAns) {
    optionTexts[optionTexts.length - 1] = inlineAns[1].trim();
    const resolved = resolveAnswerKey(inlineAns[2], optionTexts);
    if (resolved != null) correctOption = resolved;
  }

  const questionText = questionLines.join("\n").trim();
  const modelAnswer =
    correctOption != null && optionTexts[correctOption]
      ? optionTexts[correctOption]
      : null;

  return { questionText, options: optionTexts, correctOption, modelAnswer };
}

export function dedupeMarkers(text: string): string {
  return text
    .replace(/(\d+)\.\s+\1\.\s+/g, "$1. ")
    .replace(/([A-F])\)\s+\1\)\s+/gi, (_, l) => `${l.toUpperCase()}) `);
}

export function preprocessFlatListBeforeAnswer(html: string): string {
  return html.replace(
    /<ol[^>]*>((?:(?!<ol)[\s\S])*?)<\/ol>\s*(<p[^>]*>\s*(?:(?:correct|right|model)\s+)?(?:answer|ans)[^<]*<\/p>)/gi,
    (_full, inner: string, answerP: string) => {
      const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      const items: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = liRe.exec(inner)) !== null) items.push(m[1]);
      if (items.length < 3) return _full;
      const q = items[0];
      const opts = items.slice(1);
      const nested =
        `<ol><li>${q}<ol>` +
        opts.map((o) => `<li>${o}</li>`).join("") +
        `</ol></li></ol>`;
      return nested + answerP;
    }
  );
}

export function htmlToStructuredText(html: string): string {
  let work = decodeHtmlEntities(html);
  work = preprocessFlatListBeforeAnswer(work);

  const handNumbered = /<p[^>]*>\s*\d+\s*[.)]/i.test(work);

  work = work.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (_m, src) => `\n[IMG:${src}]\n`);

  function stripTags(s: string): string {
    return decodeHtmlEntities(s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  }

  function walkList(inner: string, depth: number): string {
    const out: string[] = [];
    const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let m: RegExpExecArray | null;
    let qNum = 0;
    let optIdx = 0;
    while ((m = liRe.exec(inner)) !== null) {
      const liInner = m[1];
      const nested = liInner.match(/<ol[^>]*>([\s\S]*)<\/ol>/i);
      const textOnly = nested ? liInner.replace(/<ol[^>]*>[\s\S]*<\/ol>/i, "") : liInner;
      const text = stripTags(textOnly);
      if (!text && !nested) continue;

      const hasMarker =
        /^\s*(?:Q(?:uestion)?\s*)?\d+\s*[.):\]]/i.test(text) ||
        /^\s*[A-Fa-f]\s*[.):\]]/i.test(text);

      if (!handNumbered && depth === 0) {
        qNum++;
        out.push(hasMarker ? `\n${text}\n` : `\n${qNum}. ${text}\n`);
      } else {
        const letter = LETTERS[optIdx % 26];
        optIdx++;
        out.push(hasMarker ? `${text}\n` : `${letter}) ${text}\n`);
      }
      if (nested) out.push(walkList(nested[1], depth + 1));
    }
    return out.join("");
  }

  work = work.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_m, inner) => walkList(inner, 0));

  work = work
    .replace(/<\/(?:p|div|tr|h[1-6]|table)>/gi, "\n")
    .replace(/<(?:p|div|tr|h[1-6]|table)[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return dedupeMarkers(work.replace(/\n{3,}/g, "\n\n").trim());
}

export function countParseStats(
  questions: Array<{ options?: string[] | null; correctOption?: number | null }>
) {
  const total = questions.length;
  const withOptions = questions.filter((q) => q.options && q.options.length >= 2).length;
  const withCorrect = questions.filter((q) => q.correctOption != null).length;
  return { total, withOptions, withCorrect };
}
