import { prisma } from "../clients/prisma.js";
import { KnowledgeBaseService } from "./knowledgeBaseService.js";

type OnboardInput = {
  email: string;
  firstName: string;
  lastName?: string;
  partnerName: string;
  homeCity: string;
  preferredBudget?: string;
  preferredRadiusKm?: number;
};

export class UserService {
  private readonly knowledgeBaseService = new KnowledgeBaseService();

  async onboard(input: OnboardInput) {
    const user = await prisma.user.upsert({
      where: { email: input.email },
      update: {
        firstName: input.firstName,
        lastName: input.lastName,
        profile: {
          upsert: {
            update: {
              partnerName: input.partnerName,
              homeCity: input.homeCity,
              preferredBudget: input.preferredBudget,
              preferredRadiusKm: input.preferredRadiusKm ?? 30
            },
            create: {
              partnerName: input.partnerName,
              homeCity: input.homeCity,
              preferredBudget: input.preferredBudget,
              preferredRadiusKm: input.preferredRadiusKm ?? 30
            }
          }
        }
      },
      create: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        profile: {
          create: {
            partnerName: input.partnerName,
            homeCity: input.homeCity,
            preferredBudget: input.preferredBudget,
            preferredRadiusKm: input.preferredRadiusKm ?? 30
          }
        }
      },
      include: { profile: true }
    });

    await this.knowledgeBaseService.upsertProfileMemory({
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName ?? undefined,
      partnerName: user.profile?.partnerName ?? input.partnerName,
      homeCity: user.profile?.homeCity ?? input.homeCity,
      preferredBudget: user.profile?.preferredBudget ?? input.preferredBudget,
      preferredRadiusKm: user.profile?.preferredRadiusKm ?? input.preferredRadiusKm ?? 30
    });

    return user;
  }
}
