#!/usr/bin/env python3
"""Apply only the checksum-matched room repair. Does not change gifts or balances."""
from pathlib import Path
import hashlib, json, shutil, subprocess, sys, tempfile, datetime

ROOT=Path('/opt/akira')
REV='4e4944391feec8bee9baf51c413d331d5a51dd51'
PREFIX='repairs/current-room-20261027/'
def run(args, **kw):
    return subprocess.run(args, check=True, cwd=ROOT, **kw)
def source(path):
    return subprocess.check_output(['git','show',REV+':'+PREFIX+path],cwd=ROOT)
def digest(data): return hashlib.sha256(data).hexdigest()
compose=['docker','compose','-f',str(ROOT/'server/compose.yaml')]
expected=json.loads(source('expected-sha256.json'))
updates={name:source('files/'+name) for name in expected}
for name,expected_hash in expected.items():
    p=ROOT/name
    if not p.is_file() or digest(p.read_bytes())!=expected_hash:
        sys.exit('STOP: current file differs: '+name+'; nothing changed.')
for name in ['web/src/room.js','web/src/room-live.js']:
    p=ROOT/'dist'/Path(name).relative_to('web')
    if not p.is_file() or digest(p.read_bytes())!=expected[name]:
        sys.exit('STOP: published web file differs: '+str(p)+'; nothing changed.')
    updates[str(p.relative_to(ROOT))]=updates[name]
with tempfile.TemporaryDirectory(prefix='akira-room-check-') as tmp:
    for name,data in updates.items():
        p=Path(tmp)/Path(name).name;p.write_bytes(data)
        run(['node','--check',str(p)])
backup=ROOT/'repair-backups'/datetime.datetime.now(datetime.timezone.utc).strftime('room-%Y%m%d-%H%M%S')
backup.mkdir(parents=True,exist_ok=False)
for name in updates:
    p=backup/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/name,p)
print('BACKUP:',backup,flush=True)
# Additive migration only; existing accounts, gifts and wallet rows are untouched.
sql=source('files/server/migrations/011_room_seats.sql')
run(compose+['exec','-T','akira-api','node','--input-type=module','-e',
 "import {getPool} from './src/database.mjs';import{readFileSync}from'node:fs';const p=getPool();try{await p.query(readFileSync(0,'utf8'));console.log('Seat schema ready')}finally{await p.end()}"],input=sql)
try:
    for name,data in updates.items():
        p=ROOT/name;temp=p.with_name(p.name+'.room-repair-tmp');temp.write_bytes(data);shutil.copymode(p,temp);temp.replace(p)
    run(compose+['build','akira-api'])
    run(compose+['up','-d','--no-deps','akira-api'])
    run(compose+['exec','-T','akira-api','node','--input-type=module','-e',
     "let ok=false;for(let i=0;i<20;i++){try{const h=await fetch('http://127.0.0.1:4301/health');const s=await fetch('http://127.0.0.1:4301/api/v1/rooms/100001/seats');if(h.ok&&s.status===401){ok=true;break}}catch{}await new Promise(r=>setTimeout(r,1000))}if(!ok)process.exit(1);console.log('API health and authenticated seat route verified')"])
except Exception:
    print('RESTORING previous files:',backup,flush=True)
    for name in updates:shutil.copy2(backup/name,ROOT/name)
    try:
        run(compose+['build','akira-api']);run(compose+['up','-d','--no-deps','akira-api'])
    except Exception:print('RESTORE RESTART FAILED: backup remains at',backup,flush=True)
    raise
print('ROOM REPAIR APPLIED. Gifts/admin/wallet data unchanged. Android APK still needs rebuild.',flush=True)
