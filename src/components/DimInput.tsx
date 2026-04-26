"use client";

export type Unit = "mm" | "in";

const MM_PER_INCH = 25.4;

export function mmToDisplay(mm: number, unit: Unit): number {
  return unit === "in" ? +(mm / MM_PER_INCH).toFixed(2) : Math.round(mm * 100) / 100;
}

export function displayToMm(value: number, unit: Unit): number {
  return unit === "in" ? +(value * MM_PER_INCH).toFixed(2) : value;
}

export function formatDim(mm: number, unit: Unit): string {
  return mmToDisplay(mm, unit).toString();
}

type Props = {
  valueMm: number;
  onChangeMm: (mm: number) => void;
  unit: Unit;
  minMm?: number;
  maxMm?: number;
  className?: string;
};

export default function DimInput({
  valueMm,
  onChangeMm,
  unit,
  minMm,
  maxMm,
  className,
}: Props) {
  const inMode = unit === "in";
  return (
    <input
      type="number"
      value={mmToDisplay(valueMm, unit)}
      min={
        inMode && minMm !== undefined
          ? mmToDisplay(minMm, unit)
          : minMm
      }
      max={
        inMode && maxMm !== undefined
          ? mmToDisplay(maxMm, unit)
          : maxMm
      }
      step={inMode ? 0.01 : 1}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (Number.isNaN(v)) {
          onChangeMm(0);
          return;
        }
        onChangeMm(displayToMm(v, unit));
      }}
      className={className}
    />
  );
}
