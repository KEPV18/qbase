const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  modifiedTime: string;
  createdTime: string;
  size?: string;
}

export function getPreviewUrl(file: DriveItem): string {
  if (file.mimeType.includes("google-apps.document") || file.mimeType.includes("google-apps.spreadsheet") || file.mimeType.includes("google-apps.presentation")) {
    const id = file.id;
    if (file.mimeType.includes("document")) return `https://docs.google.com/document/d/${id}/preview`;
    if (file.mimeType.includes("spreadsheet")) return `https://docs.google.com/spreadsheets/d/${id}/preview`;
    if (file.mimeType.includes("presentation")) return `https://docs.google.com/presentation/d/${id}/preview`;
  }
  if (file.mimeType.includes("wordprocessing") || file.mimeType.includes("msword")) return `https://docs.google.com/document/d/${file.id}/preview`;
  if (file.mimeType.includes("spreadsheet") || file.mimeType.includes("ms-excel")) return `https://docs.google.com/spreadsheets/d/${file.id}/preview`;
  if (file.mimeType.includes("presentation") || file.mimeType.includes("ms-powerpoint")) return `https://docs.google.com/presentation/d/${file.id}/preview`;
  if (file.mimeType.includes("pdf")) return `https://drive.google.com/file/d/${file.id}/preview`;
  return `https://drive.google.com/file/d/${file.id}/preview`;
}

export function getEditUrl(file: DriveItem): string {
  return file.webViewLink || `https://drive.google.com/file/d/${file.id}/edit`;
}

export function formatFileSize(bytes?: string): string {
  if (!bytes) return "—";
  const size = parseInt(bytes);
  if (isNaN(size)) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function getFileTypeIcon(mimeType: string): string {
  if (mimeType.includes("folder")) return "folder";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "spreadsheet";
  if (mimeType.includes("document") || mimeType.includes("word")) return "document";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "presentation";
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("image")) return "image";
  return "file";
}