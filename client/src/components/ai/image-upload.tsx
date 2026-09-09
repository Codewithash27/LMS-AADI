import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Image, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onImageUpload: (file: File) => void;
  onImageRemove: () => void;
  imagePreview: string | null;
  isUploading: boolean;
}

export function ImageUpload({ onImageUpload, onImageRemove, imagePreview, isUploading }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
      if (allowedTypes.includes(file.type)) {
        onImageUpload(file);
      } else {
        alert("Only PNG, JPEG, and JPG image files are allowed");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
      if (allowedTypes.includes(file.type)) {
        onImageUpload(file);
      } else {
        alert("Only PNG, JPEG, and JPG image files are allowed");
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // If there's already an image preview, show it with remove option
  if (imagePreview) {
    return (
      <div className="relative inline-block">
        <img 
          src={imagePreview} 
          alt="Uploaded image" 
          className="max-h-48 max-w-full rounded-md border border-input"
        />
        <Button 
          variant="destructive" 
          size="icon" 
          className="absolute top-1 right-1 h-6 w-6 rounded-full"
          onClick={onImageRemove}
          disabled={isUploading}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Remove image</span>
        </Button>
      </div>
    );
  }

  // Otherwise show the upload area
  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors",
        isDragging ? "border-primary bg-primary/5" : "border-input",
        isUploading && "opacity-50 cursor-not-allowed"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={!isUploading ? triggerFileInput : undefined}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleFileSelect}
        disabled={isUploading}
      />
      <div className="flex flex-col items-center gap-2 py-2">
        <Image className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {isUploading ? "Uploading..." : "Click or drag a PNG, JPEG, or JPG image here"}
        </p>
      </div>
    </div>
  );
}