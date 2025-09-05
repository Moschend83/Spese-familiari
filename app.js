document.addEventListener("DOMContentLoaded", () => {
  const categorie = [
    "Alimentari", "Gatti", "Auto", "Casa", "Beauty Martina", "Beauty Daniele",
    "Shopping Martina", "Shopping Daniele", "Divertimento", "Farmacia/medico",
    "Extra Martina", "Extra Daniele", "Regali", "Viaggi"
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
  const CLIENT_ID = "869733304794-uuomdn2i9cbr3u48j8ltthie5d5askdf.apps.googleusercontent.com";
  let token = null;

  const totaleRimanente = document.getElementById("totale-rimanente");
  const categorieContainer = document.getElementById("categorie-container");
  const categoriaSelect = document.getElementById("categoria");
  const budgetCapitoli = {};

  // Autenticazione Google
  document.getElementById("login-google").addEventListener("click", () => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      callback: (response) => {
        token = response.access_token;
        alert("Accesso effettuato con successo!");
        caricaBudgetDaSheet();
      }
    });
    tokenClient.requestAccessToken();
  });

  // Genera le card delle categorie
  categorie.forEach(cat => {
    const card = document.createElement("div");
    card.className = "categoria-card";
    card.setAttribute("data-cat", cat);
    card.innerHTML = `
      <i class="${icone[cat]} fa-2x"></i><br>
      <strong>${cat}</strong><br>
      € <span id="valore-${cat}">0</span>
    `;
    categorieContainer.appendChild(card);

    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categoriaSelect.appendChild(option);
  });

  // Mostra form per impostare budget
  document.getElementById("apri-budget").addEventListener("click", () => {
    const contenitoreCampi = document.getElementById("campi-budget");
    contenitoreCampi.innerHTML = "";
    categorie.forEach(cat => {
      const input = document.createElement("input");
      input.type = "number";
      input.placeholder = `Budget per ${cat}`;
      input.name = cat;
      input.required = true;
      contenitoreCampi.appendChild(input);
    });
    document.getElementById("budget-form").style.display = "block";
  });

  // Conferma budget iniziale
  document.getElementById("form-budget").addEventListener("submit", e => {
    e.preventDefault();
    let totale = 0;
    categorie.forEach(cat => {
      const valore = parseFloat(e.target[cat].value) || 0;
      budgetCapitoli[cat] = valore;
      document.getElementById(`valore-${cat}`).textContent = valore.toFixed(2);
      totale += valore;
    });
    totaleRimanente.textContent = totale.toFixed(2);
    document.getElementById("budget-form").style.display = "none";
    salvaBudgetSuSheet();
  });

  // Aggiunta spesa
  document.getElementById("spesa-form").addEventListener("submit", e => {
    e.preventDefault();
    const importo = parseFloat(document.getElementById("importo").value);
    const categoria = document.getElementById("categoria").value;
    const descrizione = document.getElementById("descrizione").value;

    const valoreSpan = document.getElementById(`valore-${categoria}`);
    const attuale = parseFloat(valoreSpan.textContent) || 0;
    const nuovoValore = attuale - importo;
    valoreSpan.textContent = nuovoValore.toFixed(2);

    const nuovoTotale = parseFloat(totaleRimanente.textContent) - importo;
    totaleRimanente.textContent = nuovoTotale.toFixed(2);

    inviaSpesaASheet(categoria, importo, descrizione);
    document.getElementById("spesa-form").reset();
  });

  // Salva budget nel foglio "Budget"
  function salvaBudgetSuSheet() {
    const valori = categorie.map(cat => [cat, budgetCapitoli[cat] || 0]);
    const body = { values: valori };

    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Budget!A2:B${valori.length + 1}?valueInputOption=USER_ENTERED`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(data => console.log("Budget salvato!", data))
    .catch(err => console.error("Errore salvataggio budget:", err));
  }

  // Carica budget dal foglio "Budget"
  function caricaBudgetDaSheet() {
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Budget!A2:B`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => {
      let totale = 0;
      data.values.forEach(([categoria, valore]) => {
        const importo = parseFloat(valore) || 0;
        budgetCapitoli[categoria] = importo;
        const span = document.getElementById(`valore-${categoria}`);
        if (span) span.textContent = importo.toFixed(2);
        totale += importo;
      });
      totaleRimanente.textContent = totale.toFixed(2);
    })
    .catch(err => console.error("Errore caricamento budget:", err));
  }

  // Invio spesa a Google Sheets
  function inviaSpesaASheet(categoria, importo, descrizione) {
    if (!token) {
      alert("Devi accedere con Google prima di salvare.");
      return;
    }

    const body = {
      values: [[new Date().toLocaleDateString(), categoria, importo, descrizione]]
    };

    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Spese!A1:append?valueInputOption=USER_ENTERED`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(data => console.log("Spesa salvata!", data))
    .catch(err => console.error("Errore:", err));
  }
});