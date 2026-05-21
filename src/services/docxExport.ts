// ============================================================================
// QMS Forge — .docx Export Service
// Generates structured Word documents from record data using the `docx` library.
// SAFE: Read-only — never writes to Sheets. Only reads record data for export.
// ============================================================================

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType,
  type IParagraphOptions, type ITableBordersOptions,
} from 'docx';
import { saveAs } from 'file-saver';
import { getFormSchema, type FormSchema, type FieldSchema } from '../data/formSchemas';
import { isoToDisplay } from '../schemas';
import type { RecordData } from '../components/forms/DynamicFormRenderer';

// ============================================================================
// Constants
// ============================================================================

const INDIGO = '4F46E5';   // Primary brand color
const SLATE_100 = 'F1F5F9';
const SLATE_300 = 'CBD5E1';
const SLATE_500 = '64748B';
const SLATE_700 = '334155';
const SLATE_900 = '0F172A';
const WHITE = 'FFFFFF';

const BORDER_STYLE: ITableBordersOptions = {
  top: { style: BorderStyle.SINGLE, size: 1, color: SLATE_300 },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: SLATE_300 },
  left: { style: BorderStyle.SINGLE, size: 1, color: SLATE_300 },
  right: { style: BorderStyle.SINGLE, size: 1, color: SLATE_300 },
};

// ============================================================================
// Helpers
// ============================================================================

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    // Table rows — format as count
    if (value.length === 0) return '—';
    return `${value.length} row(s)`;
  }
  return String(value);
}

function formatFieldForTable(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? '✓' : '✗';
  return String(value);
}

function getSectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 100 },
    children: [
      new TextRun({ text, bold: true, color: INDIGO, size: 26, font: 'Outfit' }),
    ],
  });
}

function getFormHeading(schema: FormSchema): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 200 },
    children: [
      new TextRun({ text: `${schema.code} — ${schema.name}`, bold: true, size: 36, font: 'Outfit', color: SLATE_900 }),
    ],
  });
}

// ============================================================================
// Metadata section (serial, dates, audit info)
// ============================================================================

function buildMetadataTable(record: Record<string, unknown>): Table {
  const rows: TableRow[] = [];

  const metaFields = [
    ['Serial', record.serial],
    ['Form', `${record.formCode} — ${record.formName}`],
    ['Status', record.status || 'N/A'],
    ['Created', isoToDisplay(record._createdAt as string)],
    ['Created By', record._createdBy || 'N/A'],
    ['Last Modified', record._lastModifiedAt ? isoToDisplay(record._lastModifiedAt as string) : '—'],
    ['Modified By', record._lastModifiedBy || '—'],
    ['Edit Count', record._editCount ?? 0],
  ];

  for (const [label, value] of metaFields) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: BORDER_STYLE,
            shading: { fill: SLATE_100 },
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, font: 'Outfit', color: SLATE_700 })] })],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            borders: BORDER_STYLE,
            children: [new Paragraph({ children: [new TextRun({ text: formatFieldValue(value), size: 20, font: 'Outfit', color: SLATE_900 })] })],
          }),
        ],
      })
    );
  }

  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

// ============================================================================
// Form fields section
// ============================================================================

function buildFieldsTable(schema: FormSchema, record: Record<string, unknown>): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Group fields by section (heading fields)
  let currentSection = '';
  const rows: TableRow[] = [];

  for (const field of schema.fields) {
    if (field.type === 'heading') {
      // Flush current section
      if (rows.length > 0) {
        paragraphs.push(
          new Paragraph({
            spacing: { before: 150 },
            children: [new TextRun({ text: currentSection, bold: true, size: 22, font: 'Outfit', color: SLATE_700 })],
          })
        );
        paragraphs.push(new Table({ rows: [...rows], width: { size: 100, type: WidthType.PERCENTAGE } }));
        rows.length = 0;
      }
      currentSection = field.label;
      continue;
    }

    const value = record[field.key];
    const displayValue = formatFieldValue(value);

    rows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            borders: BORDER_STYLE,
            shading: { fill: SLATE_100 },
            children: [new Paragraph({ children: [new TextRun({ text: field.label, bold: true, size: 20, font: 'Outfit', color: SLATE_700 })] })],
          }),
          new TableCell({
            width: { size: 65, type: WidthType.PERCENTAGE },
            borders: BORDER_STYLE,
            children: [new Paragraph({ children: [new TextRun({ text: displayValue, size: 20, font: 'Outfit', color: SLATE_900 })] })],
          }),
        ],
      })
    );
  }

  // Flush remaining
  if (rows.length > 0) {
    if (currentSection) {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 150 },
          children: [new TextRun({ text: currentSection, bold: true, size: 22, font: 'Outfit', color: SLATE_700 })],
        })
      );
    }
    paragraphs.push(new Table({ rows: [...rows], width: { size: 100, type: WidthType.PERCENTAGE } }));
  }

  return paragraphs;
}

// ============================================================================
// Table fields (sub-tables) — render each table field as its own table
// ============================================================================

function buildSubTables(schema: FormSchema, record: Record<string, unknown>): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (const field of schema.fields) {
    if (field.type !== 'table' || !field.columns) continue;

    const tableData = record[field.key] as RecordData[] | undefined;
    if (!tableData || tableData.length === 0) continue;

    // Heading
    paragraphs.push(
      new Paragraph({
        spacing: { before: 200 },
        children: [new TextRun({ text: field.label, bold: true, size: 22, font: 'Outfit', color: INDIGO })],
      })
    );

    // Header row
    const headerCells = field.columns.map(col =>
      new TableCell({
        borders: BORDER_STYLE,
        shading: { fill: INDIGO },
        children: [new Paragraph({ children: [new TextRun({ text: col.label, bold: true, size: 18, font: 'Outfit', color: WHITE })] })],
      })
    );

    const dataRows = tableData.map(row =>
      new TableRow({
        children: field.columns!.map(col =>
          new TableCell({
            borders: BORDER_STYLE,
            children: [new Paragraph({ children: [new TextRun({ text: formatFieldForTable(row[col.key]), size: 18, font: 'Outfit', color: SLATE_900 })] })],
          })
        ),
      })
    );

    paragraphs.push(new Table({
      rows: [new TableRow({ children: headerCells }), ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }));
  }

  return paragraphs;
}

// ============================================================================
// Footer
// ============================================================================

function buildFooter(record: Record<string, unknown>): Paragraph[] {
  const serial = record.serial || 'UNKNOWN';
  const exported = new Date().toISOString().substring(0, 10);

  return [
    new Paragraph({ spacing: { before: 400 }, children: [] }),
    new Paragraph({
      spacing: { before: 100 },
      borders: { top: { style: BorderStyle.SINGLE, size: 1, color: SLATE_300 } },
      children: [
        new TextRun({ text: `Generated by QMS Forge — ${serial} — Exported ${exported}`, size: 16, color: SLATE_500, font: 'Outfit', italics: true }),
      ],
    }),
  ];
}

// ============================================================================
// Main export function
// ============================================================================

export async function exportRecordToDocx(record: Record<string, unknown>): Promise<void> {
  const formCode = record.formCode as string;
  const schema = getFormSchema(formCode);

  if (!schema) {
    throw new Error(`Unknown form code: ${formCode}`);
  }

  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(getFormHeading(schema));

  // Description
  children.push(new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({ text: schema.description, italics: true, size: 20, color: SLATE_500, font: 'Outfit' })],
  }));

  // Section: Record Information
  children.push(getSectionHeading('Record Information'));
  children.push(buildMetadataTable(record));

  // Section: Form Data
  children.push(getSectionHeading('Form Data'));
  children.push(...buildFieldsTable(schema, record));

  // Sub-tables (table-type fields)
  const subTables = buildSubTables(schema, record);
  if (subTables.length > 0) {
    children.push(...subTables);
  }

  // Footer
  children.push(...buildFooter(record));

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 720, right: 720, bottom: 720, left: 720 }, // 0.5 inches
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const serial = record.serial as string;
  const filename = `${serial.replace('/', '-')}_${formCode}_${new Date().toISOString().substring(0, 10)}.docx`;
  saveAs(blob, filename);
}

// ============================================================================
// Batch export: multiple records to a single .docx
// ============================================================================

export async function exportRecordsToDocx(records: Record<string, unknown>[]): Promise<void> {
  if (records.length === 0) throw new Error('No records to export');

  const sections: typeof Document.prototype.sections = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const formCode = record.formCode as string;
    const schema = getFormSchema(formCode);
    if (!schema) continue;

    const children: (Paragraph | Table)[] = [];

    children.push(getFormHeading(schema));
    children.push(new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: schema.description, italics: true, size: 20, color: SLATE_500, font: 'Outfit' })],
    }));

    children.push(getSectionHeading('Record Information'));
    children.push(buildMetadataTable(record));

    children.push(getSectionHeading('Form Data'));
    children.push(...buildFieldsTable(schema, record));

    const subTables = buildSubTables(schema, record);
    if (subTables.length > 0) {
      children.push(...subTables);
    }

    children.push(...buildFooter(record));

    // Page break between records (except last)
    if (i < records.length - 1) {
      children.push(new Paragraph({ children: [new TextRun({ break: 1 })] }));
    }

    sections.push({
      properties: {
        page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
      },
      children,
    });
  }

  const doc = new Document({ sections });
  const blob = await Packer.toBlob(doc);
  const timestamp = new Date().toISOString().substring(0, 10);
  const filename = `QMS_Forge_Export_${records.length}_records_${timestamp}.docx`;
  saveAs(blob, filename);
}