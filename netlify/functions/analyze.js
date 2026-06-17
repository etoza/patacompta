export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { image, mediaType } = JSON.parse(event.body);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: image }
            },
            {
              type: "text",
              text: "Analyse ce ticket de caisse français et retourne UNIQUEMENT un JSON valide sans texte autour : { \"date\": \"YYYY-MM-DD\", \"montant\": 0.00, \"etablissement\": \"Nom enseigne\", \"rubrique\": \"depensesAlimentations|depensesRestaurants|depensesServices|depensesFactures|depensesMateriels|depensesTransports|depensesSorties\", \"categorie\": \"Catégorie\", \"confiance\": \"haute|moyenne|faible\" }. Règles : date du ticket YYYY-MM-DD, montant total à payer, etablissement nom lisible, rubrique la plus appropriée, categorie logique, confiance selon clarté du ticket."
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const texte = data.content?.[0]?.text || "";
    const clean = texte.replace(/```json|```/g, "").trim();
    const resultat = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(resultat)
    };

  } catch (err) {
    return {
