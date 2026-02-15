import OpenAI from "openai";

const MODERATION_MODEL = "omni-moderation-latest";

type ModerationResult = {
  flagged: boolean;
  categories: Record<string, boolean>;
  response: unknown;
  model: string;
};

let client: OpenAI | null = null;

function getClient() {
  if (client) {
    return client;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for text moderation");
  }

  client = new OpenAI({ apiKey });
  return client;
}

export async function moderateText(content: string): Promise<ModerationResult> {
  const normalized = content.trim();
  if (!normalized) {
    return {
      flagged: false,
      categories: {},
      response: null,
      model: MODERATION_MODEL
    };
  }

  const openai = getClient();
  const response = await openai.moderations.create({
    model: MODERATION_MODEL,
    input: normalized
  });

  const result = response.results[0];
  const rawCategories = ((result?.categories ?? {}) as unknown) as Record<string, unknown>;
  const categories = Object.fromEntries(
    Object.entries(rawCategories).map(([key, value]) => [
      key,
      Boolean(value)
    ])
  );

  return {
    flagged: Boolean(result?.flagged),
    categories,
    response,
    model: MODERATION_MODEL
  };
}
