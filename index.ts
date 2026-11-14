import { streamText } from "ai";

const result = streamText({
  model: "openai/gpt-6-astra",
  prompt:
    "Invent a new holiday and describe its traditions. Give the holiday a memorable name and explain how people celebrate it.",
  onError({ error }) {
    console.error("Text generation failed:", error);
  },
});

let text = "";
for await (const textPart of result.textStream) {
  text += textPart;
  process.stdout.write(textPart);
}
process.stdout.write("\n");

if (!text.trim()) {
  throw new Error("The model returned an empty response.");
}
