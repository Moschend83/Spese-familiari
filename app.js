document.addEventListener("DOMContentLoaded", () => {
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
  const CLIENT_ID      = "INSERISCI_IL_TUO_CLIENT_ID_WEB";
  let token            = null;
  const budgetCapitoli = {};

  const totaleRimanente    = document.getElementById("totale-rimanente");
  const categorieContainer = document.getElementById("categorie-container");
  const categoriaSelect    = document.getElementById("categoria");

  // ‣ Inizializza tokenClient per Sheets API
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    callback: resp => {
      token = resp.access_token;
      console.log("TOKEN ricevuto:", token);
      caricaBudgetDaSheet();
    }
  });

  // ‣ Auto‐login all’apertura
  tokenClient.requestAccessToken();

  // ‣ Fallback: nuovo consenso su click
  document.getElementById("login-google").addEventListener("click", () => {
    tokenClient.requestAccessToken({ prompt: "consent" });
  });

  // ‣ Genera le card delle categorie + select
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

  // ‣ Apri form Inizio Mese con prefill
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

  // ‣ Conferma Inizio Mese: somma + salva
  document.getElementById("form-budget").addEventListener("submit", e => {
    e.preventDefault();
    let tot = 0;
    categorie.forEach(cat => {
      const aggiunta  = parseFloat(e.target[cat].value) || 0;
      const precedente = budgetCapitoli[cat] || 0;
      const aggiornato = precedente + aggiunta;
     
