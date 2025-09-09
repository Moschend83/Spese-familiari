function initApp() {
  const categorie = [
    "Alimentari", "Gatti", "Auto", "Casa",
    "Beauty Martina", "Beauty Daniele",
    "Shopping Martina", "Shopping Daniele",
    "Divertimento", "Farmacia/medico",
    "Extra Martina", "Extra Daniele",
    "Regali", "Viaggi"
  ];

  const icone = {
    "Alimentari": "fa-solid fa-carrot",
    "Gatti": "fa-solid fa-cat",
    "Auto": "fa-solid fa-car",
    "Casa": "fa-solid fa-house",
    "Beauty Martina": "fa-solid fa-spa",
    "Beauty Daniele": "fa-solid fa-pump-soap",
    "Shopping Martina": "fa-solid fa-shirt",
    "Shopping Daniele": "fa-solid fa-tshirt",
    "Divertimento": "fa-solid fa-champagne-glasses",
    "Farmacia/medico": "fa-solid fa-pills",
    "Extra Martina": "fa-solid fa-star",
    "Extra Daniele": "fa-solid fa-gift",
    "Regali": "fa-solid fa-gift",
    "Viaggi": "fa-solid fa-plane"
  };

  const SPREADSHEET_ID = "1Ip1KFSPv_iZBogt6A2D5-iEg-K9xZXLFK81xYZ1z4eU";
  const CLIENT_ID      = "869733304794-uuomdn2i9cbr3u48j8ltthie5d5askdf.apps.googleusercontent.com";

  let token = null;
  const budgetCapitoli = {};

  const totaleRimanente    = document.getElementById("totale-rimanente");
  const categorieContainer = document.getElementById("categorie-container");
  const categoriaSelect    = document.getElementById("categoria");

  // Inizializza OAuth2 token client (solo su click)
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: "openid email https://www.googleapis.com/auth/spreadsheets",
    callback: resp => {
      if (resp.error) {
        console.error("OAuth2 Error:", resp);
        alert("Login OAuth fallito. Controlla console.");
        return;
      }
      token = resp.access_token;
      console.log("Access token:", token);
      caricaBudgetDaSheet();
    }
  });

  // Login OAuth2 SOLO quando l’utente clicca
  document
    .getElementById("login-google")
    .addEventListener("click", () => {
      tokenClient.requestAccessToken({ prompt: "consent" });
    });

  // Genera card categorie + select
  categorie.forEach(cat => {
    const card = document.createElement("div");
    card.className = "categoria-card";
    card.innerHTML = `
      <i class="${icone[cat]} fa-2x"></i><br>
      <strong>${cat}</strong><br>
      € <span id="valore-${cat}">0.00</span>
    `;
    categorieContainer.appendChild(card);

    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categoriaSelect.appendChild(option);
  });

  // Apri form Inizio Mese con prefill
  document.getElementById("apri-budget").addEventListener("click", () => {
    const contenitore = document.getElementById("campi-budget");
    contenitore.innerHTML = "";
    categorie.forEach(cat => {
      const input = document.createElement("input");
      input.type        = "number";
      input.step        = "0.01";
      input.placeholder = `Budget per ${cat}`;
      input.name        = cat;
      input.required    = true;
      input.value       =
        budgetCapitoli[cat] !== undefined
          ? budgetCapitoli[cat].toFixed(2)
          : "";
      contenitore.appendChild(input);
    });
    document.getElementById("budget-form").style.display = "block";
  });

  // Conferma Inizio Mese: somma + salva
  document.getElementById("form-budget").addEventListener("submit", e => {
    e.preventDefault();
    let tot = 0;
    categorie.forEach(cat => {
      const aggiunta  = parseFloat(e.target[cat].value) || 0;
      const precedente = budgetCapitoli[cat] || 0;
      const aggiornato = precedente + aggiunta;
      budgetCapitoli[cat] = aggiornato;
      document.getElementById(`valore-${cat}`).textContent =
        aggiornato.toFixed(2);
      tot += aggiornato;
    });
    totaleRimanente.textContent = tot.toFixed(2);
    document.getElementById("budget-form").style.display = "none";
    salvaBudgetSuSheet();
  });

  // Aggiunta spesa con virgola e tracciamento utente
  document.getElementById("spesa-form").addEventListener("submit", e => {
    e.preventDefault();

    const rawVal = document.getElementById("importo").value.trim();
    const numVal = parseFloat(rawVal.replace(",", "."));
    if (isNaN(numVal)) {
      alert("Importo non valido. Usa un numero come 1,11");
      return;
    }

    const categoria   = document.getElementById("categoria").value;
    const descrizione = document.getElementById("descrizione").value;

    // aggiorna UI
    const span = document.getElementById(`valore-${categoria}`);
    const attuale     = parseFloat(span.textContent) || 0;
    const nuovoValore = attuale - numVal;
    span.textContent  = nuovoValore.toFixed(2);

    const totNow = parseFloat(totaleRimanente.textContent) || 0;
    totaleRimanente.textContent = (totNow - numVal).toFixed(2);

    inviaSpesaASheet(categoria, numVal, descrizione);
    e.target.reset();
  });

  // — Func Google Sheets —  

  function salvaBudgetSuSheet() {
    const valori = categorie.map(cat => [cat, budgetCapitoli[cat] || 0]);
    const body   = { values: valori };
    fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`
      + `/values/Budget!A2:B${valori.length + 1}`
      + `?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    )
    .then(() => console.log("Budget aggiornato"))
    .catch(e => console.error("Errore salvaBudget:", e));
  }

  function caricaBudgetDaSheet() {
    fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`
      + `/values/Budget!A2:B`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )
    .then(r => r.json())
    .then(data => {
      let tot = 0;
      (data.values || []).forEach(([cat, val]) => {
        const num = parseFloat(val) || 0;
        budgetCapitoli[cat] = num;
        const span = document.getElementById(`valore-${cat}`);
        if (span) span.textContent = num.toFixed(2);
        tot += num;
      });
      totaleRimanente.textContent = tot.toFixed(2);
    })
    .catch(e => console.error("Errore caricaBudget:", e));
  }

  function inviaSpesaASheet(cat, imp, desc) {
    if (!token) {
      alert("Devi accedere prima di salvare");
      return;
    }
    const body = {
      values: [[
        new Date().toLocaleDateString(),
        cat,
        imp,
        desc,
        window.userEmail || ""
      ]]
    };
    fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`
      + `/values/Spese!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    )
    .then(() => console.log("Spesa salvata con utente:", window.userEmail))
    .catch(e => console.error("Errore inviaSpesa:", e));
  }
}

