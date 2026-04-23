import { RecommendationService } from "../services/recommendationService.js";
import { UserService } from "../services/userService.js";

type ParsedArgs = {
  email: string;
  firstName: string;
  partnerName: string;
  city: string;
  vibes: string[];
  text?: string;
  budget?: string;
  radius?: number;
};

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    email: "riya@example.com",
    firstName: "Riya",
    partnerName: "Arjun",
    city: "Jaipur",
    vibes: ["peaceful-green"]
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (!next) {
      continue;
    }

    if (token === "--email") {
      parsed.email = next;
      index += 1;
      continue;
    }

    if (token === "--name") {
      parsed.firstName = next;
      index += 1;
      continue;
    }

    if (token === "--partner") {
      parsed.partnerName = next;
      index += 1;
      continue;
    }

    if (token === "--city") {
      parsed.city = next;
      index += 1;
      continue;
    }

    if (token === "--vibes") {
      parsed.vibes = next
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }

    if (token === "--text") {
      parsed.text = next;
      index += 1;
      continue;
    }

    if (token === "--budget") {
      parsed.budget = next;
      index += 1;
      continue;
    }

    if (token === "--radius") {
      parsed.radius = Number(next);
      index += 1;
    }
  }

  return parsed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const userService = new UserService();
  const recommendationService = new RecommendationService();

  const user = await userService.onboard({
    email: args.email,
    firstName: args.firstName,
    partnerName: args.partnerName,
    homeCity: args.city,
    preferredBudget: args.budget,
    preferredRadiusKm: args.radius
  });

  const result = await recommendationService.generate({
    userId: user.id,
    city: args.city,
    selectedVibes: args.vibes,
    freeText: args.text
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Planner test failed");
  console.error(error);
  process.exit(1);
});
