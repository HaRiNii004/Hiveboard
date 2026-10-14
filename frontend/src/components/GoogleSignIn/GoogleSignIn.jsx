import { useEffect, useState } from 'react';
import { getGoogleConfig, googleLogin } from '../../api/auth';
import { getApiErrorMessage } from '../../utils/apiError';
import googleIcon from '../../assets/google.svg';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

// Loaded once per page load, shared by the login and sign-up pages
let setupPromise = null;

// Resolves with the client id when Google sign-in is set up on the server and
// Google's script has loaded; with null otherwise (the button is then not shown)
const loadGoogle = () => {
  if (!setupPromise) {
    setupPromise = getGoogleConfig()
      .then(response => {
        const { enabled, clientId } = response.data;
        if (!enabled) return null;
        return new Promise(resolve => {
          if (window.google && window.google.accounts) {
            resolve(clientId);
            return;
          }
          const script = document.createElement('script');
          script.src = GSI_SRC;
          script.async = true;
          script.onload = () => resolve(clientId);
          script.onerror = () => {
            setupPromise = null; // try again next time
            resolve(null);
          };
          document.head.appendChild(script);
        });
      })
      .catch(err => {
        console.error(err);
        setupPromise = null;
        return null;
      });
  }
  return setupPromise;
};

// "or continue with" + the Google button. Renders nothing unless Google sign-in is
// configured, so there's never a button that doesn't work.
//   rememberMe       ask for a long-lived login
//   onSuccess(auth)  the backend's AuthResponse ({ token, email, fullName })
//   onError(message)
export default function GoogleSignIn({ rememberMe = false, onSuccess, onError }) {
  const [clientId, setClientId] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogle().then(id => {
      if (!cancelled) setClientId(id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!clientId) return null;

  // The popup has to open straight from the click (or browsers block it),
  // which is why Google's script is loaded before the button is shown
  const handleClick = () => {
    setBusy(true);
    const client = window.google.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: 'openid email profile',
      ux_mode: 'popup',
      callback: async (response) => {
        if (response.error) {
          setBusy(false);
          if (response.error !== 'access_denied') onError('Google sign-in failed. Please try again.');
          return;
        }
        try {
          const result = await googleLogin(response.code, rememberMe);
          onSuccess(result.data);
        } catch (err) {
          console.error(err);
          onError(getApiErrorMessage(err, 'Google sign-in failed. Please try again.'));
        } finally {
          setBusy(false);
        }
      },
      error_callback: (err) => {
        setBusy(false);
        // Closing the popup is not an error worth showing
        if (err && err.type !== 'popup_closed') {
          onError('Could not open Google sign-in. Allow pop-ups for this site and try again.');
        }
      }
    });
    client.requestCode();
  };

  return (
    <>
      <div className="divider">
        <span>or continue with</span>
      </div>
      <button type="button" className="social-btn google" onClick={handleClick} disabled={busy}>
        <img src={googleIcon} alt="" width="18" height="18" />
        <span>{busy ? 'Signing in with Google...' : 'Google'}</span>
      </button>
    </>
  );
}
