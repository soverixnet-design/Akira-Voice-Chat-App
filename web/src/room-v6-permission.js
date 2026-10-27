/* V8 microphone permission: request native Android runtime access on a user gesture.
   WebRTC still verifies its own capture permission; no blanket WebView grant. */
(function(){
 'use strict';
 var checking=null;
 async function requestMic(){
   if(checking)return checking;
   checking=(async function(){
     try{
       var cap=window.Capacitor;
       var nativePlugin=cap&&cap.Plugins&&cap.Plugins.AkiraMicrophone;
       if(nativePlugin&&typeof nativePlugin.ensure==='function'){
         var nativeResult=await nativePlugin.ensure();
         if(!nativeResult||nativeResult.granted!==true){
           throw Object.assign(new Error('Android microphone access denied. Open App Settings → Permissions → Microphone.'),{name:'NotAllowedError'});
         }
       }
       if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
         throw Error('Microphone API unavailable in this Android WebView');
       }
       var stream=await navigator.mediaDevices.getUserMedia({audio:{
         echoCancellation:true,noiseSuppression:true,autoGainControl:true
       }});
       stream.getTracks().forEach(function(track){track.stop()});
       return true;
     }catch(e){
       if(typeof window.toast==='function'){
         var denied=e&&(['NotAllowedError','PermissionDeniedError'].includes(e.name));
         var busy=e&&(['NotReadableError','AbortError'].includes(e.name));
         window.toast(denied?'Allow microphone in Android App Settings.':busy?'Microphone busy. End other calls and try again.':'Microphone: '+(e.message||'permission failed'));
       }
       return false;
     }finally{checking=null}
   })();
   return checking;
 }
 window.akiraEnsureMicPermission=requestMic;
})();
