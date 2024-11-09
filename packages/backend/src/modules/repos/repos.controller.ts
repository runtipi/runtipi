import { Controller, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { ConfigurationService } from "@/core/config/configuration.service";
import { ReposService } from "./repos.service";
import { PullDto } from "./dto/repos.dto";
import { ZodSerializerDto } from "nestjs-zod";

@UseGuards(AuthGuard)
@Controller("repos")
export class ReposController {
    constructor(
        private readonly reposService: ReposService,
        private readonly config: ConfigurationService
    ) {}

    @Post("/pull")
    @ZodSerializerDto(PullDto)
    async pull(): Promise<PullDto> {
        const appsRepoUrl = this.config.get("appsRepoUrl");
        await this.reposService.pullRepo(appsRepoUrl);
        return { success: true };
    }
}