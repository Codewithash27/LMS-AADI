import type { ReactNode } from "react";
import { Play } from "lucide-react";

type PlayerFrameProps = {
  kind: "video" | "doc" | "quiz" | "loading";
  children?: ReactNode;
};

export function PlayerFrame({ kind, children }: PlayerFrameProps) {
  if (kind === "loading") {
    return (
      <div className="scp-frame scp-poster" aria-busy="true">
        <span className="scp-play" aria-hidden>
          <Play strokeWidth={2.2} />
        </span>
      </div>
    );
  }

  if (kind === "video") {
    return <div className="scp-frame">{children}</div>;
  }

  return <div className={kind === "quiz" ? "scp-card scp-quiz" : "scp-card scp-doc"}>{children}</div>;
}
