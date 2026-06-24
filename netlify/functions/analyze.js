exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { image, mediaType } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "Clé API manquante" }) };
    }

    const prompt = `Analyse cette photo de ticket de caisse et extrais les informations suivantes en JSON uniquement, sans texte autour :
{
  "date": "YYYY-MM-DD",
  "montant": 12.50,
  "etablissement": "Nom du magasin ou restaurant",
  "rubrique": "depensesAlimentations",
  "categorie": "Grande surface",
  "confiance": "haute"
}

Règles :
- date : la date du ticket au format YYYY-MM-DD. Si absente, mets la date d'aujourd'hui.
- montant : le montant TOTAL payé (pas un sous-total). Nombre décimal.
- etablissement : le nom du magasin, restaurant ou enseigne.
- rubrique : choisis parmi exactement ces valeurs selon le type d'établissement :
  "depensesAlimentations" pour supermarché, épicerie, boulangerie, pharmacie
  "depensesRestaurants" pour restaurant, fast food, café, livraison repas
  "depensesTransports" pour carburant, parking, transport
  "depensesFactures" pour factures, abonnements, services récurrents
  "depensesMateriels" pour achats de matériel, vêtements, électronique
  "depensesServices" pour coiffeur, médecin, réparations, services
  "depensesSorties" pour cinéma, concert, bar, divertissement
- categorie : une catégorie précise correspondant à la rubrique choisie
- confiance : "haute" si tu es sûr, "moyenne" si incertain, "faible" si peu lisible

Réponds UNIQUEMENT avec le JSON, rien d'autre.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mediaType, data: image } }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 512 }
        })
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini error:", err);
      return { statusCode: 500, body: JSON.stringify({ error: "Erreur Gemini : " + err }) };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const clean = text.replace(/```json|```/g, "").trim();
    const resultat = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resultat)
    };

  } catch (err) {
    console.error("Erreur analyze:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur lors de l'analyse : " + err.message })
    };
  }
};
