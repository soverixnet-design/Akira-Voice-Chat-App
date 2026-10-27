package com.akira.voice;

import android.Manifest;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/** Requests Android RECORD_AUDIO only after the user taps the microphone or a seat. */
@CapacitorPlugin(
    name = "AkiraMicrophone",
    permissions = {@Permission(alias = "microphone", strings = {Manifest.permission.RECORD_AUDIO})}
)
public class AkiraMicrophonePlugin extends Plugin {
    @PluginMethod
    public void ensure(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            finish(call);
        } else {
            requestPermissionForAlias("microphone", call, "onMicrophonePermission");
        }
    }

    @PermissionCallback
    private void onMicrophonePermission(PluginCall call) {
        finish(call);
    }

    private void finish(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", getPermissionState("microphone") == PermissionState.GRANTED);
        call.resolve(result);
    }
}
