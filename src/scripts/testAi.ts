import { createLlmClient } from "../clients/llmClient.js";

type ParsedArgs = {
  city: string;
  vibes: string[];
  text?: string;
  memory: string[];
};

function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    city: "Jaipur",
    vibes: ["peaceful-green"],
    memory: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === "--city" && next) {
      result.city = next;
      index += 1;
      continue;
    }

    if (token === "--vibes" && next) {
      result.vibes = next
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }

    if (token === "--text" && next) {
      result.text = next;
      index += 1;
      continue;
    }

    if (token === "--memory" && next) {
      result.memory = next
        .split("|")
        .map((value) => value.trim())
        .filter(Boolean);
      index += 1;
    }
  }

  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const llmClient = createLlmClient();

  const response = await llmClient.analyzeVibes({
    city: args.city,
    selectedVibes: args.vibes,
    freeText: args.text,
    memorySnippets: args.memory
  });

  console.log(JSON.stringify(response, null, 2));
}

main().catch((error) => {
  console.error("AI test failed");
  console.error(error);
  process.exit(1);
});
