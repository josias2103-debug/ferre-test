// js/ai-service.js

export default {
    async preguntar(pregunta, catalogo, apiKey) {
        if (!apiKey) return "Error: No se ha configurado la clave de Groq.";
        
        // Creamos una descripción corta del catálogo para que la IA sepa qué hay
        const resumenCatalogo = catalogo.map(p => `${p.nombre} (Stock: ${p.stock}, Precio: $${p.precio})`).join(', ');

        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        {
                            role: "system",
                            content: `Eres un asistente experto de una ferretería. Tienes este catálogo: ${resumenCatalogo}. 
                            Responde de forma muy breve y profesional. Si el cliente busca algo, sugiere el producto exacto del catálogo.`
                        },
                        { role: "user", content: pregunta }
                    ],
                    temperature: 0.7
                })
            });

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error("Error Groq:", error);
            return "Lo siento, la IA no está disponible ahora.";
        }
    }
};
