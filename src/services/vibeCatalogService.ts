import { VibeRepository } from "../repositories/vibeRepository.js";

export class VibeCatalogService {
  constructor(private readonly vibeRepository = new VibeRepository()) {}

  list() {
    return this.vibeRepository.listActive();
  }

  seed() {
    return this.vibeRepository.seedDefaults();
  }
}
