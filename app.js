document.addEventListener("DOMContentLoaded", () => {
  // 1) Definizioni iniziali
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

  // Riferimenti DOM
  const totaleEl   = document.getElementById("totale-rimanente");
  const contCat    = document.getElementById("categorie-container");
  const selCat     = document.getElementById("categoria");
  const btnApri    = document.getElementById("apri-budget");
  const formBudget = document.getElementById("form-budget");
  const boxBudget  = document.getElementById("campi-budget");
  const formSpesa  = document.getElementById("spesa-form");
  const btnLogin   = document.getElementById("login-google");

  // 2) Genera dinamicamente cards e select categorie
  categorie.forEach(cat => {
    // card
    const card = document.createElement("div");
    card.className = "categoria-card";
    card.innerHTML = `
      <i class="${icone[cat]} fa-2x"></i><br>
      <strong>${cat}</strong><br>
      € <span id="valore-${cat}">0.00</span>
    `;
    contCat.appendChild(card);

    // option
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    selCat.appendChild(opt);
  });

  // 3) APRI form budget (senza dipendere da login)
  btnApri.addEventListener("click", () => {
    boxBudget.innerHTML = "";
    categorie.forEach(cat => {
      const inp = document.createElement("input");
      inp.type        = "number";
      inp.step        = "0.01";
      inp.placeholder = `Budget per ${cat}`;
      inp.name        = cat;
      inp.required    = true;
      // prefill se già caricato
      inp.value = budgetCapitoli[cat] != null
        ? budgetCapitoli[cat].toFixed(2)
        : "";
      boxBudget.appendChild(inp);
    });
    formBudget.style.display = "block";
  });

  // 4) SUBMIT budget: somma + UI + salva su Sheet
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
    if (token) salvaBudget();
  });

  // 5) SUBMIT spesa: virgola → punto, UI + append su Sheet
  formSpesa.addEventListener("submit", e => {
    e.preventDefault();
    const raw   = document.getElementById("importo").value.trim();
    const val   = parseFloat(raw.replace(",", "."));  
    if (isNaN(val)) return alert("Importo non valido: usa 1,11");
    const cat  = selCat.value;
    const desc = document.getElementById("descrizione").value;

    // aggiorno UI
    const span = document.getElementById(`valore-${cat}`);
    const att  = parseFloat(span.textContent) || 0;
    const nw   = att - val;
    span.textContent = nw.toFixed(2);
    totaleEl.textContent = (parseFloat(totaleEl.textContent) - val).toFixed(2);

    if (token) inviaSpesa(cat, val, desc);
    e.target.reset();
  });

  // 6) Prepare OAuth2 token client (popup SOLO su click)
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: "openid email https://www.googleapis.com/auth/spreadsheets",
    callback: resp => {
      if (resp.error) {
        console.error("OAuth2 Error:", resp);
        return alert("Login fallito, guarda console.");
      }
      token = resp.access_token;
      caricaBudgetDaSheet();
    }
  });

  btnLogin.addEventListener("click", () => {
    // One-Tap per userEmail
    google.accounts.id.prompt();
    // OAuth2 popup
    tokenClient.requestAccessToken({ prompt: "consent" });
  });

  // ——————————————————————————————————————————————————————————————————
  // FUNZIONI per Google Sheets
  function salvaBudget() {
    const vals = categorie.map(c => [c, budgetCapitoli[c] || 0]);
    fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`
      + `/values/Budget!A2:B${vals.length+1}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ values: vals })
      }
    )
    .then(() => console.log("Budget salvato"))
    .catch(e => console.error(e));
  }

  function caricaBudgetDaSheet() {
    fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`
      + `/values/Budget!A2:B`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    .then(r => r.json())
    .then(d => {
      let tot=0;
      (d.values||[]).forEach(([c,v]) => {
        const n = parseFloat(v)||0;
        budgetCapitoli[c] = n;
        const el = document.getElementById(`valore-${c}`);
        if (el) el.textContent = n.toFixed(2);
        tot += n;
      });
      totaleEl.textContent = tot.toFixed(2);
    })
    .catch(e => console.error(e));
  }

  function inviaSpesa(cat, imp, desc) {
    const body = {
      values: [[
        new Date().toLocaleDateString(),
        cat, imp, desc,
        window.userEmail||""
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
    .then(() => console.log("Spesa inviata"))
    .catch(e => console.error(e));
  }
});
