#!/usr/bin/env python3
"""Dependency-free PandaQR client. Secrets remain in environment/header only."""
import argparse
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--key', help='Idempotency key for an identical retry')
    parser.add_argument('command', choices=['list','get','create','upload','update','replace-image'])
    parser.add_argument('args', nargs='*')
    opts = parser.parse_args()
    count = {'list':0,'get':1,'create':1,'upload':1,'update':2,'replace-image':2}[opts.command]
    if len(opts.args) != count:
        parser.error(f'{opts.command} requires {count} arguments')
    base = os.environ.get('PANDAQR_BASE_URL','https://app.pandaqr.xyz/api/v1').rstrip('/')
    url = urllib.parse.urlsplit(base)
    if base != 'https://app.pandaqr.xyz/api/v1' and not (url.scheme == 'http' and url.hostname in ('127.0.0.1','localhost') and url.path == '/api/v1' and not url.username and not url.query and not url.fragment):
        parser.error('Only the PandaQR API or loopback HTTP is allowed')
    token = os.environ.get('PANDAQR_ACCESS_TOKEN')
    if not token:
        parser.error('Set PANDAQR_ACCESS_TOKEN in the environment')
    headers = {'Authorization': 'Bearer '+token, 'User-Agent': 'PandaQR-Agent/1.0'}
    command = opts.command
    body = None
    method = 'GET'
    path = '/qrs'
    if command in ('get','update','replace-image'):
        path += '/'+urllib.parse.quote(opts.args[0],safe='')
    if command in ('create','update'):
        body = json.dumps(json.load(open(opts.args[-1],encoding='utf-8')),separators=(',',':')).encode()
        headers['Content-Type'] = 'application/json'
        method = 'POST' if command == 'create' else 'PATCH'
    if command in ('upload','replace-image'):
        with open(opts.args[-1],'rb') as f:
            body = f.read(2*1024*1024+1)
        if not body or len(body)>2*1024*1024:
            parser.error('Image must be 1 byte to 2 MiB')
        headers['Content-Type'] = mimetypes.guess_type(opts.args[-1])[0] or 'application/octet-stream'
        path = '/images' if command == 'upload' else path+'/image'
        method = 'POST' if command == 'upload' else 'PUT'
    if method != 'GET':
        key = opts.key or str(uuid.uuid4())
        headers['Idempotency-Key'] = key
        print('Idempotency-Key: '+key,file=sys.stderr)
    opener = urllib.request.build_opener(NoRedirect())
    items = []
    while True:
        try:
            with opener.open(urllib.request.Request(base+path,data=body,method=method,headers=headers),timeout=30) as res:
                result = json.load(res)
        except urllib.error.HTTPError as e:
            print(f'HTTP {e.code}; X-Request-Id: {e.headers.get("X-Request-Id", "-")}; Retry-After: {e.headers.get("Retry-After", "-")}',file=sys.stderr)
            print(e.read().decode(),file=sys.stderr)
            return 1
        except (urllib.error.URLError, TimeoutError) as e:
            print(f'Network failure ({type(e).__name__}). Read the QR before retrying a write.',file=sys.stderr)
            return 1
        if command != 'list':
            print(json.dumps(result,ensure_ascii=False,indent=2)); return 0
        items.extend(result['data']['qrs'])
        cursor = result['data']['next_cursor']
        if not cursor:
            print(json.dumps({'ok':True,'data':{'qrs':items}},ensure_ascii=False,indent=2)); return 0
        path = '/qrs?cursor='+urllib.parse.quote(cursor,safe='')

if __name__ == '__main__':
    raise SystemExit(main())
