import { useState } from "react";
import { avatarColor, photoSrc, studentInitials } from "@/components/students/students-shared";
import { cn } from "@/lib/utils";

type StudentFaceProps = {
  id: number;
  firstName?: string;
  lastName?: string;
  profilePhoto?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const SIZES = {
  sm: "h-[46px] w-[46px] text-[13px]",
  md: "h-14 w-14 text-sm",
  lg: "h-24 w-24 text-2xl",
};

export function StudentFace({
  id,
  firstName,
  lastName,
  profilePhoto,
  className,
  size = "sm",
}: StudentFaceProps) {
  const [broken, setBroken] = useState(false);
  const photo = photoSrc(profilePhoto);
  const initials = studentInitials(firstName, lastName);
  const color = avatarColor(id);

  if (photo && !broken) {
    return (
      <img
        src={photo}
        alt=""
        className={cn("shrink-0 rounded-full object-cover", SIZES[size], className)}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-extrabold text-[#0A0A0F]",
        SIZES[size],
        className
      )}
      style={{ background: color }}
    >
      {initials}
    </span>
  );
}
