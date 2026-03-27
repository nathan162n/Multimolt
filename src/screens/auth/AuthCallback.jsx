import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthClient } from '../../lib/supabase';
import { AuthLayout } from '../../components/auth/AuthLayout';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');
  const processingRef = useRef(false);

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (processingRef.current) return;
    processingRef.current = true;

    // Listen to the main process pushing the deep-link URL details here
    const unsubscribe = window.hivemind.on('auth:handle-deep-link', async (eventPayload) => {
      const { path, params } = eventPayload;
      
      try {
        const supabase = await getAuthClient();
        
        // If it's a reset password link, the 'type' param will be 'recovery'
        if (params.type === 'recovery') {
          // Manually parse fragment tokens (Supabase relies on window.location.hash by default,
          // but Electron deep links don't mutate window.location)
          if (params.access_token && params.refresh_token) {
            await supabase.auth.setSession({
              access_token: params.access_token,
              refresh_token: params.refresh_token,
            });
          }
          navigate('/auth/reset-password', { replace: true });
          return;
        }

        // For standard OAuth / magic link logins
        if (params.access_token && params.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          
          if (error) throw error;
          
          // Redirect to dashboard (or intended destination if we passed it in state)
          navigate('/', { replace: true });
        } else if (params.error_description || params.error) {
          // Log the raw error for debugging but show a static message to the user
          // to prevent attacker-crafted deep-link error descriptions from being displayed.
          console.error('[Auth Callback] OAuth error:', params.error, params.error_description);
          throw new Error('Authentication was denied or failed. Please try again.');
        } else {
          // If no tokens found, maybe the session was already restored?
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            navigate('/', { replace: true });
          } else {
            throw new Error('Invalid authentication link.');
          }
        }
      } catch (err) {
        console.error('[Auth Callback Error]', err);
        setErrorMsg(err.message || 'Authentication failed. Please try again.');
        setTimeout(() => {
          navigate('/auth/signin', { replace: true });
        }, 3000);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  return (
    <AuthLayout>
      <div className="flex flex-col items-center justify-center p-12 text-center bg-[var(--color-bg-base)] border border-[var(--color-border-light)] shadow-card rounded-[var(--radius-xl)]">
        {errorMsg ? (
          <>
            <div className="w-12 h-12 rounded-full bg-[var(--color-status-error-bg)] flex items-center justify-center mb-4">
              <span className="text-xl font-bold text-[var(--color-status-error-dot)]">!</span>
            </div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">Sign In Failed</h2>
            <p className="text-sm text-[var(--color-status-error-text)]">{errorMsg}</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-6">Redirecting to sign in...</p>
          </>
        ) : (
          <>
            <LoadingSpinner size={32} />
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mt-6 mb-2">Authenticating</h2>
            <p className="text-sm text-[var(--color-text-tertiary)]">Please wait while we log you in...</p>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
