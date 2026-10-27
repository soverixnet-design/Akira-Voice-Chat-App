import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const room=readFileSync(new URL('../web/src/room.js',import.meta.url),'utf8');
test('room JavaScript parses and loads pinned LiveKit SDK before voice token',()=>{
  const parsed=spawnSync(process.execPath,['--check'],{input:room,encoding:'utf8',timeout:10000});
  assert.equal(parsed.status,0,parsed.stderr);
  assert.match(room,/https:\/\/cdn\.jsdelivr\.net\/npm\/livekit-client@2\.22\.3\/dist\/livekit-client\.umd\.min\.js/);
  assert.match(room,/await akiraEnsureVoiceSdk\(\)/);
  assert.match(room,/window\.__akiraVoiceSdkPromise=null;throw err/);
  assert.match(room,/RoomEvent\.TrackSubscribed/);
  assert.match(room,/akira:voice-connected/);
  assert.match(room,/Microphone permission needed; listening is still active/);
  assert.match(room,/localParticipant\.setMicrophoneEnabled/);
});
