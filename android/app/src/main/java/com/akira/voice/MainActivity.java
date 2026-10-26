package com.akira.voice;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(AkiraRoomStatePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
