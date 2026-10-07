import { Body, Controller, Post } from '@nestjs/common';
import { ChainsService } from './chains.service.js';

@Controller('chains')
export class ChainsController {
  constructor(private readonly chainsService: ChainsService) { }


  @Post('polish')
  async polish(@Body() { text }: { text: string }) {
    return await this.chainsService.polish(text)
  }

  @Post('genblog')
  async genBlog(@Body() { keywords }: { keywords: string[] }) {
    return await this.chainsService.generateBlog(keywords)
  }

  @Post('router')
  async smartRouter(@Body() { question }: { question: string }) {
    return await this.chainsService.smartRouter(question)
  }
}
