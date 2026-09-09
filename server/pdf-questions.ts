import path from "path";
import fs from "fs";
import mammoth from "mammoth";

export type ParsedQuestion = {
  text: string;
  modelAnswer?: string | null;
  imageUrl?: string | null;
};

/**
 * Extract question / answer blocks from plain text (e.g. from a PDF or DOCX).
 * Supports patterns like:
 *   Q1. ... / Question 1: ... / 1) ... / 1. ...
 * Optional answers:
 *   Answer: ... / Ans: ... / Model Answer: ...
 * Optional images:
 *   [IMG:/uploads/questions/xxx.png] or Markdown image syntax
 */
export function parseQuestionsFromText(rawText: string): ParsedQuestion[] {
  const text = (rawText || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  if (!text) return [];

  const startRegex =
    /(?:^|\n)\s*(?:Q(?:uestion)?\s*[-.]?\s*)?(\d+)\s*[.)\]:\-]\s+/gi;

  const matches: { index: number; number: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = startRegex.exec(text)) !== null) {
    matches.push({ index: match.index + (match[0].startsWith("\n") ? 1 : 0), number: match[1] });
  }

  if (matches.length === 0) {
    // Fallback: split on blank lines if numbered markers are missing
    return text
      .split(/\n\s*\n+/)
      .map((block) => block.replace(/\s+/g, " ").trim())
      .filter((block) => block.length >= 10)
      .map((block) => splitQuestionAndAnswer(block))
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
      return splitQuestionAndAnswer(cleaned);
    })
    .filter((q) => q.text.length > 0);
}

function splitQuestionAndAnswer(block: string): ParsedQuestion {
  // Extract image tag if present in the block
  let imageUrl: string | null = null;
  const imgMatch =
    block.match(/\[IMG:(https?:\/\/[^\s\]]+|\/uploads\/[^\s\]]+)\]/i) ||
    block.match(/!\[.*?\]\((https?:\/\/[^\s\)]+|\/uploads\/[^\s\)]+)\)/i);

  let cleanedBlock = block;
  if (imgMatch) {
    imageUrl = imgMatch[1];
    cleanedBlock = block.replace(imgMatch[0], "").trim();
  }

  const answerMatch = cleanedBlock.match(
    /\n\s*(?:model\s*)?(?:answer|ans|solution)\s*[:\-]\s*([\s\S]+)$/i
  );

  if (answerMatch) {
    const text = cleanedBlock.slice(0, answerMatch.index).replace(/\s+/g, " ").trim();
    const modelAnswer = answerMatch[1].replace(/\s+/g, " ").trim();
    return {
      text,
      modelAnswer: modelAnswer || null,
      imageUrl,
    };
  }

  return {
    text: cleanedBlock.replace(/\s+/g, " ").trim(),
    modelAnswer: null,
    imageUrl,
  };
}

/**
 * Extract questions and embedded images from a Word (.docx) file buffer.
 */
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
          const imageUrl = `/uploads/questions/${fileName}`;
          return { src: imageUrl };
        });
      }),
    }
  );

  const html = result.value || "";
  // Convert HTML <img> tags into [IMG:url] tokens for text parser
  const processedText = html
    .replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, "\n[IMG:$1]\n")
    .replace(/<p[^>]*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<h[1-6][^>]*>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return parseQuestionsFromText(processedText);
}

/**
 * Extract embedded images (e.g. JPEGs) from a PDF file buffer.
 */
export function extractImagesFromPdfBuffer(pdfBuffer: Buffer): string[] {
  const imagePaths: string[] = [];
  const uploadsDir = path.join(process.cwd(), "uploads", "questions");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  let offset = 0;
  let count = 0;
  while (offset < pdfBuffer.length - 4 && count < 30) {
    // Find JPEG start marker 0xFF 0xD8 0xFF
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
      // Ensure it's a substantial image (>1KB) and not a tiny fragment
      if (imgBuffer.length > 1024) {
        const fileName = `pdf-img-${Date.now()}-${count + 1}.jpg`;
        const filePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(filePath, imgBuffer);
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
