/**
 * Renders nothing in a correctly configured deploy. If VITE_BACKEND_URL was
 * never set at build time, every API call in the app silently targets
 * localhost and fails with a bare "Failed to fetch" — this makes that
 * failure mode visible and actionable instead of a mystery.
 */
export function ConfigWarningBanner() {
  const misconfigured = (window as any).ROASTIFY_MISCONFIGURED === true;
  if (!misconfigured) return null;

  return (
    <div className="border-b border-verdict/40 bg-verdict/10 px-5 py-2.5 text-center">
      <p className="font-mono text-xs text-verdict">
        <strong>Backend not configured.</strong> VITE_BACKEND_URL was not set
        when this was built, so nothing here can connect. Set it in your
        host's environment variables and redeploy.
      </p>
    </div>
  );
}
