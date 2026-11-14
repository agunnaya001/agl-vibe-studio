import { generateText } from "ai";

const { text } = await generateText({
  model: "moonshotai/kimi-k3",
  prompt:
    "Invent a new holiday and describe its traditions. Give the holiday a memorable name and explain how people celebrate it.",
});

if (!text.trim()) {
  throw new Error("The model returned an empty response.");
}

console.log(text);
