import { useState, useCallback, useRef } from "react";

export function useResizableColumns(defaultWidths: Record<string, number>) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(defaultWidths);
  const resizingRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  const handleMouseDown = useCallback((col: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[col] || defaultWidths[col] || 150;
    resizingRef.current = { col, startX, startWidth };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const diff = ev.clientX - resizingRef.current.startX;
      const newWidth = Math.max(60, resizingRef.current.startWidth + diff);
      setColumnWidths(prev => ({ ...prev, [resizingRef.current!.col]: newWidth }));
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths, defaultWidths]);

  const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);

  return { columnWidths, handleMouseDown, totalWidth };
}
