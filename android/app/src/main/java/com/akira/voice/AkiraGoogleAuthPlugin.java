package com.akira.voice;

import android.content.MutableContextWrapper;
import android.os.CancellationSignal;
import androidx.annotation.NonNull;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

@CapacitorPlugin(name = "AkiraGoogleAuth")
public class AkiraGoogleAuthPlugin extends Plugin {
    @PluginMethod
    public void signIn(PluginCall call) {
        String clientId = call.getString("clientId");
        if (clientId == null || !clientId.matches("^[0-9]+-[a-zA-Z0-9_-]+\\.apps\\.googleusercontent\\.com$")) {
            call.reject("Google Web Client ID is not configured");
            return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                GetSignInWithGoogleOption googleOption = new GetSignInWithGoogleOption.Builder(clientId).build();
                GetCredentialRequest request = new GetCredentialRequest.Builder()
                        .addCredentialOption(googleOption)
                        .build();
                CredentialManager credentialManager = CredentialManager.create(getActivity());
                credentialManager.getCredentialAsync(
                        new MutableContextWrapper(getActivity()),
                        request,
                        new CancellationSignal(),
                        command -> getActivity().runOnUiThread(command),
                        new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                            @Override
                            public void onResult(@NonNull GetCredentialResponse response) {
                                Credential credential = response.getCredential();
                                if (!(credential instanceof CustomCredential)) {
                                    call.reject("Unsupported Google credential type");
                                    return;
                                }
                                CustomCredential custom = (CustomCredential) credential;
                                if (!GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(custom.getType())) {
                                    call.reject("Google did not return an ID token");
                                    return;
                                }
                                try {
                                    GoogleIdTokenCredential googleId = GoogleIdTokenCredential.createFrom(custom.getData());
                                    String idToken = googleId.getIdToken();
                                    if (idToken == null || idToken.isEmpty()) {
                                        call.reject("Google returned an empty ID token");
                                        return;
                                    }
                                    JSObject result = new JSObject();
                                    result.put("idToken", idToken);
                                    call.resolve(result);
                                } catch (Exception ex) {
                                    call.reject("Could not parse Google identity", ex);
                                }
                            }

                            @Override
                            public void onError(@NonNull GetCredentialException error) {
                                call.reject("Google account selection failed: " + error.getClass().getSimpleName());
                            }
                        }
                );
            } catch (Exception error) {
                call.reject("Google Sign-In unavailable", error);
            }
        });
    }
}
