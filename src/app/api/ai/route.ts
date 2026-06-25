import { streamText } from 'ai';
import { google } from '@ai-sdk/google'; 

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();

console.log(body);

const { prompt, command } = body;

    let systemPrompt = "You are a helpful writing assistant.";
    if (command === 'improve') {
      systemPrompt = "Rewrite the following text to make it more professional, clear, and engaging. Return ONLY the rewritten text. Do not include quotes or conversational filler.";
    } else if (command === 'fix') {
      systemPrompt = "Fix all grammar, punctuation, and spelling errors in the following text. Do not change the original meaning. Return ONLY the fixed text.";
    } else if (command === 'shorter') {
      systemPrompt = "Make the following text significantly shorter and punchier while retaining the core message. Return ONLY the shortened text.";
    }

    const result = await streamText({
      model: google("gemini-2.5-flash"),
      system: systemPrompt,
      prompt: prompt,
    });

    const text = await result.text;

console.log("AI Output:", text);

return new Response(text, {
  headers: {
    "Content-Type": "text/plain; charset=utf-8",
  },
});

  } catch (error) {
    console.error("AI Route Error:", error);
    return new Response(JSON.stringify({ error: "AI failed to process request" }), { status: 500 });
  }
}