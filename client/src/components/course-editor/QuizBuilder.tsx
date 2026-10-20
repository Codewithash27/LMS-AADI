import { FileText, Plus, Shuffle, Trash2, Upload, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ParsedMcqQuestion } from "@/lib/mcq-question-import";

type QuizOption = { id: number; text: string; isCorrect: boolean };
type QuizQuestion = { id: number; text: string; options: QuizOption[] };

type QuizBuilderProps = {
  mode: "manual" | "upload";
  onMode: (mode: "manual" | "upload") => void;
  questions: QuizQuestion[];
  fileName: string;
  pool: ParsedMcqQuestion[];
  importCount: number;
  parsing: boolean;
  currentQuestion: string;
  options: QuizOption[];
  onFile: (file: File | null) => void;
  onCount: (count: number) => void;
  onPick: () => void;
  onRemove: (id: number) => void;
  onQuestion: (value: string) => void;
  onOptionText: (id: number, text: string) => void;
  onToggleCorrect: (id: number) => void;
  onAdd: () => void;
};

export function QuizBuilder(props: QuizBuilderProps) {
  return (
    <div className="ced-quiz">
      <h4>Quiz questions</h4>
      <div className="ced-quiz-modes">
        <button type="button" className={props.mode === "manual" ? "on" : undefined} onClick={() => props.onMode("manual")}>
          <b><PenLine strokeWidth={2} aria-hidden /> Manual entry</b>
          <span>Add questions and mark correct options.</span>
        </button>
        <button type="button" className={props.mode === "upload" ? "on" : undefined} onClick={() => props.onMode("upload")}>
          <b><Upload strokeWidth={2} aria-hidden /> Upload PDF / Word</b>
          <span>Same MCQ format as exams (A) B) C) D), Answer: B).</span>
        </button>
      </div>
      {props.mode === "upload" && (
        <div className="ced-quiz-upload">
          <div>
            <p>{props.fileName || "No file selected"}</p>
            <span>PDF (.pdf) or Word (.docx)</span>
            {props.pool.length > 0 && <Badge className="mt-2">{props.pool.length} in pool</Badge>}
          </div>
          <label>
            <input
              type="file"
              accept="application/pdf,.pdf,.docx,.doc"
              className="sr-only"
              disabled={props.parsing}
              onChange={(event) => {
                void props.onFile(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
            <span className="ced-choose">
              <FileText strokeWidth={2} aria-hidden />
              {props.parsing ? "Parsing..." : props.pool.length ? "Replace document" : "Upload document"}
            </span>
          </label>
          {props.pool.length > 0 && (
            <div className="ced-quiz-pick">
              <Label className="k">Questions to use</Label>
              <Input
                type="number"
                min={1}
                max={props.pool.length}
                value={props.importCount}
                className="ced-input"
                onChange={(event) =>
                  props.onCount(
                    Math.min(props.pool.length, Math.max(1, parseInt(event.target.value, 10) || 1))
                  )
                }
              />
              <button type="button" className="ced-choose" onClick={props.onPick}>
                <Shuffle strokeWidth={2} aria-hidden />
                Pick from document
              </button>
            </div>
          )}
        </div>
      )}
      {props.questions.length > 0 && (
        <div className="ced-questions">
          {props.questions.map((question) => (
            <div key={question.id} className="ced-question">
              <div>
                <p>{question.text}</p>
                <ul>
                  {question.options.map((option) => (
                    <li key={option.id} className={option.isCorrect ? "ok" : undefined}>
                      {option.isCorrect ? "✓ " : ""}
                      {option.text}
                    </li>
                  ))}
                </ul>
              </div>
              <button type="button" aria-label="Remove question" onClick={() => props.onRemove(question.id)}>
                <Trash2 strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}
      {props.mode === "manual" && (
        <div className="ced-new-q">
          <Label htmlFor="questionText" className="k">Question text</Label>
          <Input id="questionText" className="ced-input" value={props.currentQuestion} placeholder="Enter your question" onChange={(event) => props.onQuestion(event.target.value)} />
          <Label className="k">Answer options</Label>
          {props.options.map((option) => (
            <div key={option.id} className="ced-option">
              <Checkbox id={`option-${option.id}`} checked={option.isCorrect} onCheckedChange={() => props.onToggleCorrect(option.id)} aria-label={`Mark option ${option.id} correct`} />
              <Input className="ced-input" value={option.text} placeholder={`Option ${option.id}`} onChange={(event) => props.onOptionText(option.id, event.target.value)} />
            </div>
          ))}
          <p>Check the box next to correct answer(s).</p>
          <button type="button" className="ced-submit" onClick={props.onAdd}>
            <Plus strokeWidth={2} aria-hidden />
            Add question
          </button>
        </div>
      )}
    </div>
  );
}
