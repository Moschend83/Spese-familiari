function initApp() {
  const SPREADSHEET_ID = "1Ip1KFSPv_…";  
  const CLIENT_ID      = "869733304794-uuomdn2i9cbr3u48j8ltthie5d5askdf.apps.googleusercontent.com";  
  let token = null;

  // init tokenClient ma NON lo chiamo subito
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: "openid email https://www.googleapis.com/auth/spreadsheets",
    callback: resp => {
      if (resp.error) {
        console.error("OAuth2 error:", resp);
        alert("Login OAuth fallito, controlla console.");
        return;
      }
      token = resp.access_token;
      console.log("Access token:", token);
      caricaBudgetDaSheet();
    }
  });

  // popup solo su click
  document.getElementById("login-google")
    .addEventListener("click", () => {
      tokenClient.requestAccessToken({ prompt: "consent" });
    });

  // resto del tuo initApp (cards, budget, spese)…
}
