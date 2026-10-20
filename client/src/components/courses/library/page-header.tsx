import { Menu, Plus, Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/hooks/use-sidebar";

type PageHeaderProps = {
  search: string;
  onSearch: (value: string) => void;
  onCreate: () => void;
};

export function PageHeader({ search, onSearch, onCreate }: PageHeaderProps) {
  const isMobile = useIsMobile();
  const { setMobileOpen } = useSidebar();

  return (
    <div className="lib-head">
      <div>
        <div className="lib-crumb">
          {isMobile && (
            <button
              type="button"
              className="rail-icon-btn"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu strokeWidth={2} />
            </button>
          )}
          <span className="k">Academics / Courses</span>
        </div>
        <h1 className="lib-title">
          Course <i>library</i>
        </h1>
      </div>
      <div className="lib-tools">
        <label className="lib-search">
          <Search strokeWidth={2} aria-hidden />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search anything..."
            aria-label="Search courses"
          />
        </label>
        <button type="button" className="lib-new" onClick={onCreate}>
          <Plus strokeWidth={2.4} aria-hidden />
          New course
        </button>
      </div>
    </div>
  );
}
