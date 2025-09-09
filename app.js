document.addEventListener("DOMContentLoaded", () => {
  const SPREADSHEET_ID = "1Ip1KFSPv_iZBogt6A2D5-iEg-K9xZXLFK81xYZ1z4eU";
  const CLIENT_ID      = "869733304794-uuomdn2i9cbr3u48j8ltthie5d5askdf.apps.googleusercontent.com";

  const categorie = [
    "Alimentari","Gatti","Auto","Casa",
    "Beauty Martina","Beauty Daniele",
    "Shopping Martina","Shopping Daniele",
    "Divertimento","Farmacia/medico",
    "Extra Martina","Extra Daniele",
    "Regali","Viaggi"
  ];

  const icone = {
    "Alimentari":"fa-solid fa-carrot","Gatti":"fa-solid fa-cat",
    "Auto":"fa-solid fa-car","Casa":"fa-solid fa-house",
    "Beauty Martina":"fa-solid fa-spa","Beauty Daniele":"fa-solid fa-pump-soap",
    "Shopping Martina":"fa-solid fa-shirt","Shopping Daniele":"fa-solid fa-tshirt",
    "Divertimento":"fa-solid fa-champagne-glasses","Farmacia/medico":"fa-solid fa-pills",
    "Extra Martina":"fa-solid fa-star","Extra Daniele":"fa-solid fa-gift",
    "Regali":"fa-solid fa-gift","Viaggi":"fa-solid fa-plane"
  };

  let token = null;
  const budgetCapitoli = {};

  const totaleEl   = document.getElementById("totale-rimanente");
  const contCat    = document.getElementById("categorie-container");
  const selCat     = document.getElementById("categoria");
  const btnApri    = document.getElementById("apri-budget");
  const formBudget = document.getElementById("form-budget");
  const boxBudget  = document.getElementById("campi-budget");
  const formSpesa  = document.getElementById("spesa-form");
  const btnLogin   = document.getElementById("login-google");

  // 1) Genera UI categorie e select
  categorie.forEach(cat => {
    const card = document.createElement("div");
    card.className = "categoria-card";
    card.innerHTML = `
      <i class="${icone[cat]} fa-2x"></i><br>
      <strong>${cat}</strong><br>
      € <span id="valore-${cat}">0.00</span>
    `;
    contCat.appendChild(card);

    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    selCat.appendChild(opt);
  });

  // 2) Apri form Inizio Mese
  btnApri.addEventListener("click", () => {
    boxBudget.innerHTML = "";
    categorie.forEach(cat => {
      const inp = document.createElement("input");
      inp.type        = "number";
      inp.step        = "0.01";
      inp.placeholder = `Budget per ${cat}`;
      inp.name        = cat;
      inp.required    = true;
      inp.value       = budgetCapitoli[cat] != null
                        ? budgetCapitoli[cat].toFixed(2)
                        : "";
      boxBudget.appendChild(inp);
    });
    formBudget.style.display = "block";
  });

  // 3) Conferma Budget Iniziale
  formBudget.addEventListener("submit", e => {
    e.preventDefault();
    let tot = 0;
    categorie.forEach(cat => {
      const aggi = parseFloat(e.target[cat].value) || 0;
      const old  = budgetCapitoli[cat] || 0;
      const now  = old + aggi;
      budgetCapitoli[cat] = now;
      document.getElementById(`valore-${cat}`).textContent = now.toFixed(2);
      tot += now;
    });
    totaleEl.textContent = tot.toFixed(2);
    formBudget.style.display = "none";
    if (token) salvaBudgetSuSheet();
  });

  // 4) Aggiungi Spesa (con virgola) + salva su Sheets + aggiorna Budget sheet
  formSpesa.addEventListener("submit", e => {
    e.preventDefault();

    const raw   = document.getElementById("importo").value.trim();
    const val   = parseFloat(raw.replace(",", "."));  
    if (isNaN(val)) {
      return alert("Importo non valido: usa un numero come 1,11");
    }

    const cat  = selCat.value;
    const desc = document.getElementById("descrizione").value;

    // UI: decrementa budgetCapitoli
    const span = document.getElementById(`valore-${cat}`);
    const curr = parseFloat(span.textContent) || 0;
    const next = curr - val;
    budgetCapitoli[cat] = next;
    span.textContent = next.toFixed(2);

    // UI: totale rimanente
    const totNow = parseFloat(totaleEl.textContent) || 0;
    totaleEl.textContent = (totNow - val).toFixed(2);

    // invia spesa e riscrivi Budget sheet
    inviaSpesaASheet(cat, val, desc);
    salvaBudgetSuSheet();

    e.target.reset();
  });

  // 5) Prepara OAuth2 token client
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: "openid email https://www.googleapis.com/auth/spreadsheets",
    callback: resp => {
      if (resp.error) {
        console.error("OAuth2 Error:", resp);
        return alert("Login fallito, controlla console.");
      }
      token = resp.access_token;
      caricaBudgetDaSheet();
    }
  });

  // 6) Login Google su click
  btnLogin.addEventListener("click", () => {
    google.accounts.id.prompt();
    tokenClient.requestAccessToken({ prompt: "consent" });
  });

  // ————— Funzioni Google Sheets —————

  function salvaBudgetSuSheet() {
    const values = categorie.map(cat => [cat, budgetCapitoli[cat] || 0]);
    fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`
      + `/values/Budget!A2:B${values.length + 1}`
      + `?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ values })
      }
    )
    .then(() => console.log("Budget salvato su Budget sheet"))
    .catch(e => console.error("Errore salvaBudgetSuSheet:", e));
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
      totaleEl.textContent = tot.toFixed(2);
    })
    .catch(e => console.error("Errore caricaBudgetDaSheet:", e));
  }

  function inviaSpesaASheet(categoria, importo, descrizione) {
    if (!token) {
      alert("Devi fare login prima");
      return;
    }
    const body = {
      values: [[
        new Date().toLocaleDateString(),
        categoria,
        importo,
        descrizione,
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
    .then(() => console.log("Spesa salvata su Spese sheet"))
    .catch(e => console.error("Errore inviaSpesaASheet:", e));
  }
});
