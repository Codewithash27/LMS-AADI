import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useIsMobile } from "@/hooks/use-mobile";

type SidebarContextType = {
  /** Desktop: sidebar expanded (not icon-rail). */
  collapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
  /** Mobile: temporary drawer open. */
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  closeMobile: () => void;
  /** @deprecated use collapsed / mobileOpen */
  sidebarOpen: boolean;
  /** @deprecated use toggleCollapsed / setMobileOpen */
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  closeSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

const COLLAPSED_KEY = "sidebar-collapsed";

export function SidebarProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsedState] = useState(false);
  const [mobileOpen, setMobileOpenState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(COLLAPSED_KEY);
    if (saved !== null) {
      setCollapsedState(saved === "true");
    }
    // Mobile drawer always starts closed; never inherit desktop collapse.
    setMobileOpenState(false);
    setHydrated(true);
  }, []);

  // When switching between mobile/desktop, close the mobile drawer only.
  useEffect(() => {
    if (!hydrated) return;
    setMobileOpenState(false);
  }, [isMobile, hydrated]);

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next);
    localStorage.setItem(COLLAPSED_KEY, String(next));
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  const setMobileOpen = useCallback((open: boolean) => {
    setMobileOpenState(open);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpenState(false);
  }, []);

  // Back-compat: "sidebarOpen" means expanded on desktop, drawer open on mobile.
  const sidebarOpen = isMobile ? mobileOpen : !collapsed;

  const setSidebarOpen = useCallback(
    (open: boolean) => {
      if (isMobile) {
        setMobileOpenState(open);
      } else {
        setCollapsed(!open);
      }
    },
    [isMobile, setCollapsed]
  );

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileOpenState((prev) => !prev);
    } else {
      toggleCollapsed();
    }
  }, [isMobile, toggleCollapsed]);

  const closeSidebar = useCallback(() => {
    // Only ever closes the mobile drawer — never collapses desktop.
    setMobileOpenState(false);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        toggleCollapsed,
        setCollapsed,
        mobileOpen,
        setMobileOpen,
        closeMobile,
        sidebarOpen,
        toggleSidebar,
        setSidebarOpen,
        closeSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
