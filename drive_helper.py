#!/usr/bin/env python3
"""QMS Migration: Drive Explorer and DOCX Analyzer"""
import json, urllib.request, urllib.parse, subprocess, sys, os

TOKEN_PATH = os.path.expanduser('~/.hermes/google_token.json')

def get_access_token():
    with open(TOKEN_PATH) as f:
        data = json.load(f)
    
    # Refresh the token
    post_data = urllib.parse.urlencode({
        'client_id': data['client_id'],
        'client_secret': data['client_secret'],
        'refresh_token': data['refresh_token'],
        'grant_type': 'refresh_token',
    }).encode()
    
    req = urllib.request.Request('https://oauth2.googleapis.com/token', data=post_data)
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read())
    
    # Save updated token
    data['access_token'] = result['access_token']
    with open(TOKEN_PATH, 'w') as f:
        json.dump(data, f, indent=2)
    
    return result['access_token']

def drive_api(path, token):
    url = f"https://www.googleapis.com{path}"
    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Bearer {token}')
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())

def download_file(file_id, filepath, token):
    """Download a file from Drive. For Google Docs format, export as docx."""
    # Check if it's a Google Docs format - need to export differently
    # First get file metadata
    meta = drive_api(f"/drive/v3/files/{file_id}?fields=mimeType,name", token)
    mime = meta.get('mimeType', '')
    
    # Sanitize filepath - replace slashes in filename
    dirname = os.path.dirname(filepath)
    basename = os.path.basename(filepath).replace('/', '-').replace('\\', '-')
    filepath = os.path.join(dirname, basename)
    
    # Ensure directory exists
    os.makedirs(dirname, exist_ok=True)
    
    if mime == 'application/vnd.google-apps.document':
        # Export as docx
        url = f"https://www.googleapis.com/drive/v3/files/{file_id}/export?mimeType=application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif mime == 'application/vnd.google-apps.spreadsheet':
        # Export as csv
        url = f"https://www.googleapis.com/drive/v3/files/{file_id}/export?mimeType=text/csv"
    else:
        # Download directly
        url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
    
    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Bearer {token}')
    resp = urllib.request.urlopen(req)
    with open(filepath, 'wb') as f:
        f.write(resp.read())
    return (filepath, os.path.getsize(filepath))

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'test'
    
    token = get_access_token()
    
    if cmd == 'test':
        result = drive_api('/drive/v3/files?q=%271zA3ZqbFwxsa75DBl55oXybB2jyxvagYS%27+in+parents+and+trashed=false&fields=files(id,name,mimeType)&pageSize=5', token)
        print(json.dumps(result, indent=2)[:500])
    
    elif cmd == 'list':
        folder_id = sys.argv[2] if len(sys.argv) > 2 else '1zA3ZqbFwxsa75DBl55oXybB2jyxvagYS'
        page_token = None
        all_files = []
        while True:
            path = f"/drive/v3/files?q='{folder_id}'+in+parents+and+trashed=false&fields=nextPageToken,files(id,name,mimeType,createdTime,modifiedTime)&pageSize=200"
            if page_token:
                path += f"&pageToken={page_token}"
            result = drive_api(path, token)
            all_files.extend(result.get('files', []))
            page_token = result.get('nextPageToken')
            if not page_token:
                break
        print(json.dumps(all_files, indent=2))
    
    elif cmd == 'download':
        file_id = sys.argv[2]
        output = sys.argv[3] if len(sys.argv) > 3 else '/tmp/drive_file'
        size = download_file(file_id, output, token)
        print(f"Downloaded: {output} ({size} bytes)")