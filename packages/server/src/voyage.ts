import { mnemeFn } from "@mneme/core";

export const VOYAGE_MODEL = "voyage-3";
export const VOYAGE_DIM = 1024;

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";

type VoyageResponse = {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { total_tokens: number };
};

/** Embed a single string. Throws on API error or wrong dim. */
export const embedText = mnemeFn(
  "voyage.embed",
  async (text: string): Promise<number[]> => {
    const apiKey = process.env.VOYAGE_API_KEY;
    if (!apiKey) throw new Error("VOYAGE_API_KEY not set");

    const resp = await fetch(VOYAGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ input: [text], model: VOYAGE_MODEL }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(
        `voyage embed failed: ${resp.status} ${err.slice(0, 200)}`,
      );
    }
    const data = (await resp.json()) as VoyageResponse;
    const vec = data.data[0]?.embedding;
    if (!vec || vec.length !== VOYAGE_DIM) {
      throw new Error(
        `voyage embed: unexpected response shape (got ${vec?.length} dims, want ${VOYAGE_DIM})`,
      );
    }
    return vec;
  },
);

/** Embed many strings in a batch. Voyage accepts up to 128 inputs per request. */
export const embedBatch = mnemeFn(
  "voyage.embed.batch",
  async (texts: string[]): Promise<number[][]> => {
    if (texts.length === 0) return [];
    const apiKey = process.env.VOYAGE_API_KEY;
    if (!apiKey) throw new Error("VOYAGE_API_KEY not set");

    const resp = await fetch(VOYAGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ input: texts, model: VOYAGE_MODEL }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(
        `voyage embed batch failed: ${resp.status} ${err.slice(0, 200)}`,
      );
    }
    const data = (await resp.json()) as VoyageResponse;
    if (data.data.length !== texts.length) {
      throw new Error(
        `voyage embed batch: got ${data.data.length} embeddings, want ${texts.length}`,
      );
    }
    return data.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  },
);
