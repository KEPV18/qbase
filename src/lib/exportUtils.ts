import { saveAs } from 'file-saver';

/**
 * Export data to CSV format
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; header: string }[]
): void {
  if (!data.length) {
    console.warn('No data to export');
    return;
  }

  // Get columns from first object if not provided
  const keys = columns 
    ? columns.map(c => c.key) 
    : (Object.keys(data[0]) as (keyof T)[]);
  
  const headers = columns 
    ? columns.map(c => c.header) 
    : keys.map(k => String(k));

  // Build CSV content
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      keys.map(key => {
        const value = row[key];
        // Escape quotes and wrap in quotes if contains comma
        const str = value === null || value === undefined 
          ? '' 
          : String(value);
        return str.includes(',') || str.includes('"') 
          ? `"${str.replace(/"/g, '""')}"` 
          : str;
      }).join(',')
    )
  ];

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}.csv`);
}

/**
 * Export data to JSON format
 */
export function exportToJSON<T>(
  data: T,
  filename: string,
  pretty = true
): void {
  const jsonContent = pretty 
    ? JSON.stringify(data, null, 2) 
    : JSON.stringify(data);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  saveAs(blob, `${filename}.json`);
}

/**
 * Export table to Excel-compatible XML
 */
export function exportToExcelXML<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  sheetName = 'Sheet1'
): void {
  if (!data.length) return;

  const keys = Object.keys(data[0]);
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="${sheetName}">
    <Table>
      <Row>${keys.map(k => `<Cell><Data ss:Type="String">${k}</Data></Cell>`).join('')}</Row>
      ${data.map(row => 
        `<Row>${keys.map(k => {
          const val = row[k];
          const type = typeof val === 'number' ? 'Number' : 'String';
          const data = val === null || val === undefined ? '' : String(val);
          return `<Cell><Data ss:Type="${type}">${data}</Data></Cell>`;
        }).join('')}</Row>`
      ).join('\n')}
    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' });
  saveAs(blob, `${filename}.xls`);
}

/**
 * Print-friendly export (opens print dialog)
 */
export function printTable<T extends Record<string, unknown>>(
  data: T[],
  title: string
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <table>
          <thead>
            <tr>${Object.keys(data[0] || {}).map(k => `<th>${k}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${data.map(row => 
              `<tr>${Object.values(row).map(v => `<td>${v ?? ''}</td>`).join('')}</tr>`
            ).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
}