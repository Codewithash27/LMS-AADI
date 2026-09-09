import { useMemo, useState, useCallback } from "react";

export function useClientPagination<T>(items: T[], initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(page, pageCount);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const rangeStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, total);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const goToPage = useCallback(
    (next: number) => {
      setPage(Math.max(1, Math.min(next, pageCount)));
    },
    [pageCount]
  );

  return {
    page: safePage,
    pageSize,
    total,
    pageCount,
    pageItems,
    rangeStart,
    rangeEnd,
    setPage: goToPage,
    setPageSize,
  };
}
