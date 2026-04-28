Deno.serve(async (req) => {
  const API_KEY = Deno.env.get("LLM_API_KEY");
  
  // Try the OpenAI-compatible endpoint with messages
  const resp = await fetch("https://4sapi.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      messages: [
        { role: "user", content: "Say hello in one word." }
      ],
      max_tokens: 50
    })
  });
  
  const text = await resp.text();
  return Response.json({ status: resp.status, body: text.slice(0, 500) });
});