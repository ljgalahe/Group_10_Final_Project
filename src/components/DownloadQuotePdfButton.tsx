"use client";

import {
  generateQuotePdf,
  quotePdfFilename,
  type QuotePdfData,
} from "@/lib/generate-quote-pdf";

export function DownloadQuotePdfButton({
  data,
  label = "Download Quote PDF",
  className = "rounded-md border border-green-800 px-3 py-1.5 text-xs font-medium text-green-900 hover:bg-green-50",
}: {
  data: QuotePdfData;
  label?: string;
  className?: string;
}) {
  function handleDownload() {
    const doc = generateQuotePdf(data);
    doc.save(quotePdfFilename(data.customerName, data.id));
  }

  return (
    <button type="button" onClick={handleDownload} className={className}>
      {label}
    </button>
  );
}
