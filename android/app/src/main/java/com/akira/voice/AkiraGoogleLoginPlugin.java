package com.akira.voice;

import androidx.annotation.NonNull;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

@CapacitorPlugin(name = "AkiraGoogleLogin")
public class AkiraGoogleLoginPlugin extends Plugin {
    @PluginMethod
    public void signIn(PluginCall call) {
        String clientId = call.getString("clientId");
        if (clientId == null || !clientId.matches("^[A-Za-z0-9-]+[.]apps[.]googleusercontent[.]com$")) {
            call.reject("A valid Google Web OAuth client ID is required");
            return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(clientId).build();
                GetCredentialRequest request = new GetCredentialRequest.Builder()
                    .addCredentialOption(option)
                    .build();
                CredentialManager.create(getActivity()).getCredentialAsync(
                    getActivity(),
                    request,
                    null,
                    ContextCompat.getMainExecutor(getActivity()),
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override
                        public void onResult(@NonNull GetCredentialResponse response) {
                            try {
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
                                GoogleIdTokenCredential parsed = GoogleIdTokenCredential.createFrom(custom.getData());
                                JSObject result = new JSObject();
                                result.put("idToken", parsed.getIdToken());
                                call.resolve(result);
                            } catch (Exception e) {
                                call.reject("Cannot read the Google credential", e);
                            }
                        }

                        @Override
                        public void onError(@NonNull GetCredentialException error) {
                            call.reject("Google sign-in cancelled or unavailable", error);
                        }
                    }
                );
            } catch (Exception e) {
                call.reject("Unable to start Google sign-in", e);
            }
        });
    }
}
