"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import JsBarcode from "jsbarcode";

export type TextStyle = {
  fontSize: number;
  bold: boolean;
  italic: boolean;
};

export type Position = { xPct: number; yPct: number };

export type TextEntry = {
  id: string;
  text: string;
  pos: Position;
  style: TextStyle;
};

export type BarcodeElement = {
  value: string;
  pos: Position;
  showValue: boolean;
  valueStyle: TextStyle;
  barHeight: number;
  barWidth: number;
};

export type TitleElement = {
  text: string;
  pos: Position;
  style: TextStyle;
};

export type LabelConfig = {
  widthMm: number;
  heightMm: number;
  barcode: BarcodeElement;
  title: TitleElement;
  subtitle: TitleElement;
  texts: TextEntry[];
};

export type ElementId = "barcode" | "title" | "subtitle" | string;

function styleToCss(style: TextStyle): React.CSSProperties {
  return {
    fontSize: `${style.fontSize}px`,
    fontWeight: style.bold ? 700 : 400,
    fontStyle: style.italic ? "italic" : "normal",
  };
}

function fontOptions(style: TextStyle): string {
  const parts: string[] = [];
  if (style.bold) parts.push("bold");
  if (style.italic) parts.push("italic");
  return parts.join(" ");
}

type Props = {
  config: LabelConfig;
  onMove?: (id: ElementId, xPct: number, yPct: number) => void;
  selectedId?: ElementId | null;
  onSelect?: (id: ElementId | null) => void;
  interactive?: boolean;
};

const BarcodeLabel = forwardRef<HTMLDivElement, Props>(function BarcodeLabel(
  { config, onMove, selectedId, onSelect, interactive = true },
  ref,
) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

  const [dragId, setDragId] = useState<ElementId | null>(null);
  const dragRef = useRef<{
    startMouseX: number;
    startMouseY: number;
    startXPct: number;
    startYPct: number;
  } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const data = config.barcode.value.trim();
    if (!data) {
      svgRef.current.innerHTML = "";
      return;
    }
    try {
      JsBarcode(svgRef.current, data, {
        format: "CODE128",
        displayValue: config.barcode.showValue,
        height: config.barcode.barHeight,
        width: config.barcode.barWidth,
        fontSize: config.barcode.valueStyle.fontSize,
        fontOptions: fontOptions(config.barcode.valueStyle),
        margin: 0,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch {
      if (svgRef.current) svgRef.current.innerHTML = "";
    }
  }, [
    config.barcode.value,
    config.barcode.showValue,
    config.barcode.barHeight,
    config.barcode.barWidth,
    config.barcode.valueStyle.fontSize,
    config.barcode.valueStyle.bold,
    config.barcode.valueStyle.italic,
  ]);

  useEffect(() => {
    if (!dragId || !onMove) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dxPct =
        ((e.clientX - dragRef.current.startMouseX) / rect.width) * 100;
      const dyPct =
        ((e.clientY - dragRef.current.startMouseY) / rect.height) * 100;
      const xPct = Math.max(
        0,
        Math.min(100, dragRef.current.startXPct + dxPct),
      );
      const yPct = Math.max(
        0,
        Math.min(100, dragRef.current.startYPct + dyPct),
      );
      onMove(dragId, xPct, yPct);
    };
    const onMouseUp = () => {
      setDragId(null);
      dragRef.current = null;
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragId, onMove]);

  const startDrag = (e: React.MouseEvent, id: ElementId, pos: Position) => {
    if (!interactive || !onMove) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(id);
    dragRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startXPct: pos.xPct,
      startYPct: pos.yPct,
    };
    setDragId(id);
  };

  const draggableStyle = (
    id: ElementId,
    pos: Position,
  ): React.CSSProperties => ({
    position: "absolute",
    left: `${pos.xPct}%`,
    top: `${pos.yPct}%`,
    transform: "translate(-50%, -50%)",
    width: "max-content",
    maxWidth: "100%",
    cursor: interactive ? "move" : "default",
    userSelect: "none",
    padding: "1px 3px",
    outline:
      interactive && selectedId === id ? "1px dashed #2563eb" : "none",
    background:
      interactive && selectedId === id
        ? "rgba(37, 99, 235, 0.08)"
        : "transparent",
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  });

  return (
    <div
      ref={containerRef}
      onMouseDown={() => interactive && onSelect?.(null)}
      style={{
        position: "relative",
        width: `${config.widthMm}mm`,
        height: `${config.heightMm}mm`,
        flex: "0 0 auto",
        fontFamily: "Arial, Helvetica, sans-serif",
        background: "#ffffff",
        color: "#000000",
        border: "1px solid #d4d4d8",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {config.title.text && (
        <div
          onMouseDown={(e) => startDrag(e, "title", config.title.pos)}
          style={{
            ...draggableStyle("title", config.title.pos),
            ...styleToCss(config.title.style),
          }}
        >
          {config.title.text}
        </div>
      )}

      <div
        onMouseDown={(e) => startDrag(e, "barcode", config.barcode.pos)}
        style={draggableStyle("barcode", config.barcode.pos)}
      >
        <svg
          ref={svgRef}
          style={{ display: "block", maxWidth: "100%", height: "auto" }}
        />
      </div>

      {config.subtitle.text && (
        <div
          onMouseDown={(e) => startDrag(e, "subtitle", config.subtitle.pos)}
          style={{
            ...draggableStyle("subtitle", config.subtitle.pos),
            ...styleToCss(config.subtitle.style),
          }}
        >
          {config.subtitle.text}
        </div>
      )}

      {config.texts.map((entry) => (
        <div
          key={entry.id}
          onMouseDown={(e) => startDrag(e, entry.id, entry.pos)}
          style={{
            ...draggableStyle(entry.id, entry.pos),
            ...styleToCss(entry.style),
          }}
        >
          {entry.text || "Text"}
        </div>
      ))}
    </div>
  );
});

export default BarcodeLabel;
