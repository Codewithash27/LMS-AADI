import type { ChangeEvent, DragEvent, RefObject } from "react";
import { Upload, X } from "lucide-react";

type ThumbnailStepProps = {
  preview: string;
  dragging: boolean;
  inputRef: RefObject<HTMLInputElement>;
  formatUrl: (url: string | null | undefined) => string;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
};

export function ThumbnailStep({
  preview,
  dragging,
  inputRef,
  formatUrl,
  onDragOver,
  onDragLeave,
  onDrop,
  onSelect,
  onRemove,
}: ThumbnailStepProps) {
  return (
    <div>
      {preview ? (
        <div className="ced-thumb">
          <img src={formatUrl(preview)} alt="Course thumbnail preview" />
          <button type="button" aria-label="Remove thumbnail" onClick={onRemove}>
            <X strokeWidth={2} />
          </button>
        </div>
      ) : (
        <div
          className={dragging ? "ced-drop on" : "ced-drop"}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
          }}
        >
          <Upload strokeWidth={2} aria-hidden />
          <p>Drag & drop your course image here</p>
          <span>Recommended 800x450 - Max 5MB</span>
          <span className="ced-choose">Choose file</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={onSelect} className="sr-only" />
    </div>
  );
}
