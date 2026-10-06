import devPackJson from "@/content/packs/engineering-demo.json";
import type { ContentSource } from "./ContentRepository";

export class BundledContentSource implements ContentSource {
  async loadRaw(): Promise<unknown> {
    return devPackJson;
  }
}
