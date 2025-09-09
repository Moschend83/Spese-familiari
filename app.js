function initApp() {
  const SPREADSHEET_ID = "1Ip1KFSPv_iZBogt6A2D5-iEg-K9xZXLFK81xYZ1z4eU";
  const CLIENT_ID      = "869733304794-uuomdn2i9cbr3u48j8ltthie5d5askdf.apps.googleusercontent.com";
  let token            = null;
  // …altre variabili e UI init…

  // 1) predispongo il tokenClient OAuth2 (senza auto-login)
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: "openid email https://www.googleapis.com/auth/spreadsheets",
    callback: resp => {
      if (resp.error) {
        console.error("OAuth2 Error:", resp);
        return alert("Login OAuth2 fallito, guarda console.");
      }
      token = resp.access_token;
      console.log("Access token:", token);
      caricaBudgetDaSheet();
    }
  });

  // 2) click “Accedi con Google”  
  document.getElementById("login-google")
    .addEventListener("click", () => {
      // 2a) One-Tap per raccogliere l’email
      google.accounts.id.prompt();          
      // 2b) OAuth2 per ottenere access_token
      tokenClient.requestAccessToken({ prompt: "consent" });
    });

  // …resto di initApp: genera cards, form budget, spese…
}
