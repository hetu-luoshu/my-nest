import { Body, Controller, Post } from '@nestjs/common';
import { PromptsService } from './prompts.service.js';

@Controller('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) { }

  @Post('translate')
  async translateLang(@Body() { text, lang }: { text: string; lang: string }) {
    return await this.promptsService.translateLang(text, lang);
  }

  @Post('summarize')
  async summarize(@Body() { text, maxWords }: { text: string; maxWords?: number }) {
    return await this.promptsService.summarize(text, maxWords);
  }

  @Post('classify')
  async classify(@Body() { text }: { text: string }) {
    return await this.promptsService.classify(text)
  }

  @Post('codereview')
  async codeReview(@Body() { text, language }: { text: string, language?: string }) {
    return await this.promptsService.codeReview(text, language)
  }
}
