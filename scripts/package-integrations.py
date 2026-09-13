#!/usr/bin/env python3
"""Package public integrations and optionally sync the separately deployed website."""
from pathlib import Path
import argparse
import shutil
import zipfile
p=argparse.ArgumentParser()
p.add_argument('--website',type=Path)
a=p.parse_args()
with zipfile.ZipFile('public/skills/pandaqr.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in sorted(Path('public/skills/pandaqr').rglob('*')):
  if f.is_file() and '__pycache__' not in str(f): z.write(f,f.relative_to('public/skills'))
if a.website:
 dest=a.website/'public'
 shutil.copy2('public/openapi.json',dest/'openapi.json')
 for folder in ('skills','shortcuts'):
  shutil.copytree(Path('public')/folder,dest/folder,dirs_exist_ok=True)
