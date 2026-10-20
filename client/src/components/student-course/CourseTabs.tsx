const TABS = [
  { id: "overview", label: "Overview" },
  { id: "content", label: "Course content" },
  { id: "exams", label: "Exams" },
] as const;

type CourseTabsProps = {
  value: string;
  onChange: (value: string) => void;
};

export function CourseTabs({ value, onChange }: CourseTabsProps) {
  return (
    <div className="scp-tabs" role="tablist" aria-label="Course sections">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`scp-tab-${tab.id}`}
          aria-selected={value === tab.id}
          aria-controls={`scp-panel-${tab.id}`}
          className={value === tab.id ? "on" : undefined}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
