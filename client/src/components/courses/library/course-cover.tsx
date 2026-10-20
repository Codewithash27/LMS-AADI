type CourseCoverProps = {
  pattern: number;
  thumbnail?: string | null;
  level?: string | null;
};

export function CourseCover({ pattern, thumbnail, level }: CourseCoverProps) {
  const patternClass = `cover-pattern cover-pattern-${((pattern % 6) + 6) % 6}`;

  return (
    <div className="course-cover">
      {thumbnail ? (
        <img src={thumbnail} alt="" className="course-cover-img" />
      ) : (
        <span className={patternClass} aria-hidden />
      )}
      <span className="course-cover-shade" aria-hidden />
      {level ? <span className="course-level">{level}</span> : null}
    </div>
  );
}
