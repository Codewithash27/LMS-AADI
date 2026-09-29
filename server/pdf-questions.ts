import path from "path";
import fs from "fs";
import mammoth from "mammoth";
import { htmlToStructuredText, parseMcqBlock } from "./mcq-question-parse";

export type ParsedQuestion = {
  text: string;
  modelAnswer?: string | null;
  imageUrl?: string | null;
  options?: string[] | null;
  correctOption?: number | null;
};

export function parseQuestionsFromText(rawText: string): ParsedQuestion[] {
  const text = (rawText || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  if (!text) return [];

  const startRegex =
    /(?:^|\n)\s*(?:Q(?:uestion)?\s*[-.]?\s*)?(\d+)\s*[.)\]:\-]\s+/gi;

  const matches: { index: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = startRegex.exec(text)) !== null) {
    matches.push({ index: match.index + (match[0].startsWith("\n") ? 1 : 0) });
  }

  if (matches.length === 0) {
    return text
      .split(/\n\s*\n+/)
      .map((block) => block.trim())
      .filter((block) => block.length >= 10)
      .map((block) => finalizeBlock(block))
      .filter((q) => q.text.length > 0);
  }

  const blocks: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const chunk = text.slice(start, end).trim();
    if (chunk) blocks.push(chunk);
  }

  return blocks
    .map((block) => {
      const cleaned = block
        .replace(/^(?:Q(?:uestion)?\s*[-.]?\s*)?\d+\s*[.)\]:\-]\s*/i, "")
        .trim();
      return finalizeBlock(cleaned);
    })
    .filter((q) => q.text.length > 0);
}

function finalizeBlock(block: string): ParsedQuestion {
  let imageUrl: string | null = null;
  const imgMatch =
    block.match(/\[IMG:(https?:\/\/[^\s\]]+|\/uploads\/[^\s\]]+)\]/i) ||
    block.match(/!\[.*?\]\((https?:\/\/[^\s\)]+|\/uploads\/[^\s\)]+)\)/i);

  let cleanedBlock = block;
  if (imgMatch) {
    imageUrl = imgMatch[1];
    cleanedBlock = block.replace(imgMatch[0], "").trim();
  }

  const mcq = parseMcqBlock(cleanedBlock);
  if (mcq.options.length >= 2) {
    return {
      text: mcq.questionText.replace(/\s+/g, " ").trim(),
      modelAnswer: mcq.modelAnswer ?? null,
      imageUrl,
      options: mcq.options.slice(0, 6),
      correctOption: mcq.correctOption ?? null,
    };
  }

  return splitTheoryBlock(cleanedBlock, imageUrl);
}

function splitTheoryBlock(block: string, imageUrl: string | null): ParsedQuestion {
  const answerMatch = block.match(
    /\n\s*(?:(?:correct|right|model)\s+)?(?:answer|ans|solution)\s*(?:key)?\s*[:\-–\.]\s*([\s\S]+)$/i
  );

  if (answerMatch) {
    const text = block.slice(0, answerMatch.index).trim();
    const modelAnswer = answerMatch[1].trim();
    return { text, modelAnswer: modelAnswer || null, imageUrl };
  }

  return { text: block.trim(), modelAnswer: null, imageUrl };
}

export async function parseQuestionsFromDocx(buffer: Buffer): Promise<ParsedQuestion[]> {
  const uploadsDir = path.join(process.cwd(), "uploads", "questions");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const result = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement((image) => {
        return image.read("base64").then((imageBuffer) => {
          const contentType = image.contentType || "image/png";
          const ext = contentType.split("/")[1] || "png";
          const fileName = `docx-img-${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;
          const filePath = path.join(uploadsDir, fileName);
          fs.writeFileSync(filePath, Buffer.from(imageBuffer, "base64"));
          return { src: `/uploads/questions/${fileName}` };
        });
      }),
    }
  );

  const processedText = htmlToStructuredText(result.value || "");
  return parseQuestionsFromText(processedText);
}

export function extractImagesFromPdfBuffer(pdfBuffer: Buffer): string[] {
  const imagePaths: string[] = [];
  const uploadsDir = path.join(process.cwd(), "uploads", "questions");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  let offset = 0;
  let count = 0;
  while (offset < pdfBuffer.length - 4 && count < 30) {
    if (
      pdfBuffer[offset] === 0xff &&
      pdfBuffer[offset + 1] === 0xd8 &&
      pdfBuffer[offset + 2] === 0xff
    ) {
      let endOffset = offset + 2;
      while (endOffset < pdfBuffer.length - 1) {
        if (pdfBuffer[endOffset] === 0xff && pdfBuffer[endOffset + 1] === 0xd9) {
          endOffset += 2;
          break;
        }
        endOffset++;
      }
      const imgBuffer = pdfBuffer.subarray(offset, endOffset);
      if (imgBuffer.length > 1024) {
        const fileName = `pdf-img-${Date.now()}-${count + 1}.jpg`;
        fs.writeFileSync(path.join(uploadsDir, fileName), imgBuffer);
        imagePaths.push(`/uploads/questions/${fileName}`);
        count++;
        offset = endOffset;
        continue;
      }
    }
    offset++;
  }
  return imagePaths;
}

export function pickRandomQuestions<T>(items: T[], count: number): T[] {
  const n = Math.max(0, Math.min(count, items.length));
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
