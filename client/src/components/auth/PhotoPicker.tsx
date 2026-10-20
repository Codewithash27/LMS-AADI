import { useEffect, useState } from "react";
import type { ChangeEvent, RefObject } from "react";
import { UserRound } from "lucide-react";

type PhotoPickerProps = {
  inputRef: RefObject<HTMLInputElement>;
  file: File | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function PhotoPicker({ inputRef, file, onChange }: PhotoPickerProps) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="auth-photo">
      <span>
        {preview ? <img src={preview} alt="" /> : <UserRound strokeWidth={2} aria-hidden />}
      </span>
      <div>
        <strong>Profile photo (optional)</strong>
        <p>JPG, JPEG or PNG · max 2MB</p>
        <button type="button" onClick={() => inputRef.current?.click()}>
          Select photo
        </button>
      </div>
      <input
        id="register-profile-photo"
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png"
        onChange={onChange}
      />
    </div>
  );
}
