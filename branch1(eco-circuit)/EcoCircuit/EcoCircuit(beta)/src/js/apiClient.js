/* Lightweight API client with sessionStorage fallback */
export async function saveSessionToServer(session) {
  try {
    const res = await fetch('/api/session', {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(session)
    });
    return res.ok;
  } catch (e) {
    // offline/fallback
    sessionStorage.setItem('ecocircuit_session', JSON.stringify(session));
    return false;
  }
}

export async function loadSessionFromServer() {
  try {
    const res = await fetch('/api/session');
    if (!res.ok) throw new Error('no-session');
    return await res.json();
  } catch (e) {
    const stored = sessionStorage.getItem('ecocircuit_session');
    return stored ? JSON.parse(stored) : null;
  }
}
