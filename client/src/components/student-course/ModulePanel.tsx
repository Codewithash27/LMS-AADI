import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, LayoutGrid, List, Search } from "lucide-react";
import { ModuleGrid } from "./ModuleGrid";
import { ModuleRow, type PanelLesson } from "./ModuleRow";

export type PanelModule = {
  id: number;
  title: string;
  complete: boolean;
  lessons: PanelLesson[];
};

type ModulePanelProps = {
  modules: PanelModule[];
  loading: boolean;
  activeModuleId: number | null;
  activeLessonId: number | null;
  scrollSignal: number;
  onSelectModule: (moduleId: number) => void;
  onSelectLesson: (lessonId: number) => void;
};

const COLLAPSED = 72;
const WINDOW_AT = 40;

export function ModulePanel({
  modules,
  loading,
  activeModuleId,
  activeLessonId,
  scrollSignal,
  onSelectModule,
  onSelectLesson,
}: ModulePanelProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "completed" | "remaining">("all");
  const [view, setView] = useState<"list" | "grid">("list");
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(480);
  const [openHeight, setOpenHeight] = useState(240);
  const listRef = useRef<HTMLDivElement>(null);
  const openRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return modules.filter((module) => {
      if (needle && !module.title.toLowerCase().includes(needle)) return false;
      if (filter === "completed") return module.complete;
      if (filter === "remaining") return !module.complete;
      return true;
    });
  }, [modules, query, filter]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || activeModuleId == null) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const index = visible.findIndex((module) => module.id === activeModuleId);
    if (index >= 0 && visible.length > WINDOW_AT) {
      const top = tops.rows[index] || index * COLLAPSED;
      list.scrollTop = Math.max(0, top - list.clientHeight / 2);
    }
    window.requestAnimationFrame(() => {
      list.querySelector<HTMLElement>(`[data-module="${activeModuleId}"]`)?.scrollIntoView({
        block: "center",
        behavior: reduce ? "auto" : "smooth",
      });
    });
  }, [activeModuleId, scrollSignal, visible.length, view]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => setViewport(list.clientHeight || 480);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [view, loading]);

  const windowed = view === "list" && visible.length > WINDOW_AT;
  const tops = useMemo(() => {
    const rows: number[] = [];
    let y = 0;
    visible.forEach((module) => {
      rows.push(y);
      y += module.id === activeModuleId ? Math.max(openHeight, COLLAPSED) : COLLAPSED;
    });
    return { rows, total: y };
  }, [visible, activeModuleId, openHeight]);
  const start = windowed
    ? Math.max(0, tops.rows.findIndex((top) => top + COLLAPSED > scrollTop - COLLAPSED * 3))
    : 0;
  const endIndex = windowed ? tops.rows.findIndex((top) => top > scrollTop + viewport + COLLAPSED * 4) : visible.length;
  const end = windowed ? (endIndex < 0 ? visible.length : Math.max(start + 1, endIndex)) : visible.length;
  const safeEnd = end;
  const slice = visible.slice(start < 0 ? 0 : start, safeEnd);

  useEffect(() => {
    const node = openRef.current;
    if (!node) return;
    const measure = () => setOpenHeight(node.offsetHeight || 240);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [activeModuleId, view, visible.length]);

  const jump = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-module="${activeModuleId}"]`);
    if (activeModuleId != null && visible.length > WINDOW_AT && listRef.current) {
      const index = visible.findIndex((module) => module.id === activeModuleId);
      if (index >= 0) {
        const top = tops.rows[index] || index * COLLAPSED;
        listRef.current.scrollTop = Math.max(0, top - listRef.current.clientHeight / 2);
      }
    }
    window.requestAnimationFrame(() => {
      (node || listRef.current?.querySelector<HTMLElement>(`[data-module="${activeModuleId}"]`))
        ?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    });
  };

  return (
    <section className="scp-modules" aria-label="Course modules">
      <div className="scp-modules-fill">
        <div className="scp-mod-head">
          <h2>
            Course <i>modules</i>
          </h2>
          <div className="scp-view">
            <button type="button" className={view === "list" ? "on" : undefined} aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")}>
              <List strokeWidth={2} />
            </button>
            <button type="button" className={view === "grid" ? "on" : undefined} aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => setView("grid")}>
              <LayoutGrid strokeWidth={2} />
            </button>
          </div>
        </div>
        <div className="scp-tools">
          <label className="scp-search">
            <Search strokeWidth={2} aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search modules..."
              aria-label="Search modules"
            />
          </label>
          <div className="scp-filters">
            {(
              [
                ["all", "All"],
                ["completed", "Completed"],
                ["remaining", "Remaining"],
              ] as const
            ).map(([item, label]) => (
              <button key={item} type="button" className={filter === item ? "on" : undefined} onClick={() => setFilter(item)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div
          className="scp-mod-list"
          ref={listRef}
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        >
          {loading ? (
            <div className="scp-skeletons" aria-busy="true">
              <div /><div /><div /><div />
            </div>
          ) : visible.length === 0 ? (
            <div className="scp-empty-block">
              <p>No modules match</p>
              <button
                type="button"
                className="scp-clear"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Clear search
              </button>
            </div>
          ) : view === "grid" ? (
            <ModuleGrid modules={visible} activeModuleId={activeModuleId} onSelect={onSelectModule} />
          ) : (
            <div style={windowed ? { height: tops.total, position: "relative" } : undefined}>
              <div style={windowed ? { position: "absolute", top: tops.rows[start] || 0, left: 0, right: 0 } : undefined}>
                {slice.map((module) => {
                  const index = modules.findIndex((item) => item.id === module.id) + 1;
                  const open = module.id === activeModuleId;
                  return (
                    <div key={module.id} ref={open ? openRef : undefined}>
                      <ModuleRow
                        moduleId={module.id}
                        index={index}
                        title={module.title}
                        open={open}
                        current={open}
                        complete={module.complete}
                        lessons={open ? module.lessons : []}
                        activeLessonId={activeLessonId}
                        onOpen={() => onSelectModule(module.id)}
                        onSelectLesson={onSelectLesson}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="scp-fade" aria-hidden />
        <button type="button" className="scp-jump" onClick={jump}>
          <ArrowDown strokeWidth={2.2} aria-hidden />
          Jump to current module
        </button>
      </div>
    </section>
  );
}
