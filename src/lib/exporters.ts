import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const MM_PER_INCH = 25.4;
const EXPORT_DPI = 300;

async function renderCanvas(node: HTMLElement, widthMm: number) {
  const widthInches = widthMm / MM_PER_INCH;
  const targetPx = widthInches * EXPORT_DPI;
  const scale = targetPx / node.offsetWidth;
  return html2canvas(node, {
    scale,
    backgroundColor: "#ffffff",
    useCORS: true,
  });
}

export async function exportPng(
  node: HTMLElement,
  widthMm: number,
  filename: string,
) {
  const canvas = await renderCanvas(node, widthMm);
  const dataUrl = canvas.toDataURL("image/png");
  triggerDownload(dataUrl, `${filename}.png`);
}

export async function exportPdf(
  node: HTMLElement,
  widthMm: number,
  heightMm: number,
  filename: string,
) {
  const canvas = await renderCanvas(node, widthMm);
  const dataUrl = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    unit: "mm",
    format: [widthMm, heightMm],
    orientation: widthMm >= heightMm ? "landscape" : "portrait",
  });
  pdf.addImage(dataUrl, "PNG", 0, 0, widthMm, heightMm);
  pdf.save(`${filename}.pdf`);
}

function triggerDownload(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
