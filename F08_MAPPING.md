# F/08 Order Form: DOCX → QBase Mapping

## DOCX Structure (1 table, 17 rows x 14 cols)

Row 0: Header — "Order Form / Order Confirmation" | "F/08 | Rev No.  F/08-001"
Row 1: Serial — "Sr. No. → F/08-001" | "Date → 02/01/2026"
Row 2: "Customer" → "Video Detection Client – International"
Row 3: "Mode Of Receipt" → "Ongoing Service / Existing Agreement"
Row 4: Table header — "Sr. No." | "Product Name" | "Specifications" | "Qty."
Row 5-9: Product rows (5 items)
Row 10: "Requirement Of Test Certificate" → "No"
Row 11: "Delivery Schedule" → "Continuous delivery according to client tasks"
Row 12: "Statutory And Regulatory Requirements, If Any" → "Client NDA & Data Privacy Compliance"
Row 13: "Order" → "Accepted"
Row 14: "Remarks" | "Reviewed By"
Row 15: "Bill No." → "N/A" | "(Service Contract Based)"
Row 16: "Despatch Date" → "Continuous Delivery"

## QBase form_data fields (from formSchemas.ts)

| QBase Key        | QBase Label                    | DOCX Source                                    |
|-----------------|--------------------------------|-----------------------------------------------|
| serial          | Serial Number                  | Row 1: "F/08-001" (after "Sr. No. →")          |
| date            | Date                           | Row 1: "02/01/2026" (after "Date →")            |
| client_name     | Customer                       | Row 2: "Video Detection Client – International" |
| mode_of_receipt | Mode Of Receipt                | Row 3: "Ongoing Service / Existing Agreement"   |
| items           | Products                       | Rows 5-9: Product table rows                   |
| test_certificate_required | Test Certificate Required | Row 10: "No"                             |
| delivery_schedule | Delivery Schedule             | Row 11: "Continuous delivery..."                |
| complies        | Statutory & Regulatory         | Row 12: "Client NDA & Data Privacy Compliance" |
| order_status    | Order                          | Row 13: "Accepted"                              |
| remarks         | Remarks                        | Row 14: "Projects were active before..."        |
| reviewed_by     | Reviewed By                    | Row 14: "Management Representative"             |
| bill_no         | Bill No.                       | Row 15: "N/A" or "Service Contract Based"       |
| despatch_date   | Despatch Date                  | Row 16: "Continuous Delivery"                  |

## Extraction Strategy

Each DOCX has ONE table. Fields are extracted by row number:
- Row 1: split on tab (\t) or "→" to get serial and date
- Row 2: value after "Customer" label
- Row 3: value after "Mode Of Receipt" label
- Rows 5-N (before Test Certificate): product items table
- Row 10+: label-value pairs in merged cells

For `items` field, we concatenate all product rows into a text block.