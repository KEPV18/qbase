#!/usr/bin/env python3
"""Fix F/08-001 in QBase with correct data from DOCX."""
import json, urllib.request, re
from docx import Document

def load_env():
    env = {}
    with open('/mnt/ahmed/Projects/qbase/.env.local') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k,v=line.split('=',1)
                env[k]=v
    return env

ENV = load_env()

# Extract data from DOCX
doc = Document('/home/Kepv/Downloads/03.Records/01- Sales Records/F-08 - Order Form/F_08-001.docx')
table = doc.tables[0]
rows_text = []
for row in table.rows:
    cells = [cell.text.strip().replace('\n','|') for cell in row.cells]
    parts = [p.strip() for p in cells if p.strip()]
    parts = [p for i,p in enumerate(parts) if i==0 or parts[i-1]!=p][:8]
    rows_text.append(parts)

print("=== Cleaned Rows ===")
for ri, parts in enumerate(rows_text):
    if parts and len(parts) < 8:
        print(f"  Row {ri}: {parts}")

form_data = {}
all_text = '\n'.join('|'.join(p) for p in rows_text if p)

# Date
m = re.search(r'Date\s*[🡪:\t\s]+(\d{2}/\d{2}/\d{4})', all_text)
if m: form_data['date'] = m.group(1)

# Customer
for parts in rows_text:
    if any('Customer' in p for p in parts):
        for p in parts:
            if 'Customer' not in p and len(p) > 3:
                form_data['client_name'] = p
                break

# Mode of Receipt
for parts in rows_text:
    if any('Receipt' in p or 'Ongoing' in p for p in parts):
        for p in parts:
            if 'Mode' not in p and 'Receipt' not in p and 'Ongoing' not in p and len(p) > 5:
                form_data['mode_of_receipt'] = p
                break
        if 'mode_of_receipt' not in form_data:
            for p in parts:
                if 'Ongoing Service' in p or 'Existing Agreement' in p:
                    form_data['mode_of_receipt'] = p
                    break

# Items
items = []
item_keywords = ['Video Detection', 'Vocal AI', 'Tennis', 'Omniaz', 'ETH AI']
for parts in rows_text:
    row_text = '|'.join(parts)
    if any(k in row_text for k in item_keywords) and 'Service' in row_text:
        product = [p for p in parts if any(kw in p for kw in ['Service', 'Analytics', 'Annotation', 'Testing'])]
        specs = [p for p in parts if any(kw in p for kw in 
            ['labeling', 'Conversational', 'Match tagging', 'Data annotation', 'validation', 'optimization', 'evaluation'])]
        qty = [p for p in parts if 'client volume' in p.lower()]
        if product:
            item = {'product_name': product[0]}
            if specs: item['specifications'] = specs[0]
            if qty: item['qty'] = qty[0]
            elif 'As per client volume' in row_text: item['qty'] = 'As per client volume'
            items.append(item)

if items:
    form_data['items'] = json.dumps(items, ensure_ascii=False)

# Test certificate
for parts in rows_text:
    row_text = '|'.join(parts)
    if 'Requirement' in row_text and 'Test Certificate' in row_text:
        for p in parts:
            if p.strip() in ['No', 'Yes', 'N/A']:
                form_data['test_certificate_required'] = 'Yes' if p == 'Yes' else 'No'

# Delivery schedule
for parts in rows_text:
    row_text = '|'.join(parts)
    if 'Delivery' in row_text and 'Schedule' in row_text:
        for p in parts:
            if 'Delivery' not in p and 'Schedule' not in p and len(p) > 10:
                form_data['delivery_schedule'] = p
                break

# Statutory
for parts in rows_text:
    row_text = '|'.join(parts)
    if 'Statutory' in row_text or 'Regulatory' in row_text:
        for p in parts:
            if 'NDA' in p or 'Privacy' in p or 'Compliance' in p:
                form_data['statutory_requirements'] = p
                break

# Order status
for parts in rows_text:
    row_text = '|'.join(parts)
    if 'Accepted' in row_text:
        form_data['order_status'] = 'Accepted'

# Bill No
for parts in rows_text:
    row_text = '|'.join(parts)
    if 'Bill No' in row_text:
        for p in parts:
            if 'Bill' not in p and 'No' not in p and p.strip():
                form_data['bill_no'] = p
                break

# Despatch
for parts in rows_text:
    row_text = '|'.join(parts)
    if 'Despatch' in row_text:
        for p in parts:
            if 'Despatch' not in p and p.strip():
                form_data['despatch_date'] = p
                break

# Remarks
for parts in rows_text:
    row_text = '|'.join(parts)
    if 'Remarks' in row_text:
        for p in parts:
            if 'Remarks' not in p and 'Projects' in p:
                form_data['remarks'] = p
                break

# Reviewed by
for parts in rows_text:
    row_text = '|'.join(parts)
    if 'Reviewed' in row_text and 'Representative' in row_text:
        for p in parts:
            if 'Reviewed' not in p and 'Representative' in p:
                form_data['reviewed_by'] = p
                break

print("\n=== CORRECTED form_data for F/08-001 ===")
for k,v in sorted(form_data.items()):
    print(f"  {k}: {str(v)[:120]}")

# Update in Supabase
update = {'form_data': form_data}
url = ENV['SUPABASE_URL'] + '/rest/v1/records?serial=eq.F/08-001'
req = urllib.request.Request(url, data=json.dumps(update).encode(), method='PATCH')
req.add_header('apikey', ENV['SUPABASE_SERVICE_ROLE_KEY'])
req.add_header('Authorization', 'Bearer ' + ENV['SUPABASE_SERVICE_ROLE_KEY'])
req.add_header('Content-Type', 'application/json')
resp = urllib.request.urlopen(req, timeout=10)
print(f"\n✅ F/08-001 updated in QBase!")