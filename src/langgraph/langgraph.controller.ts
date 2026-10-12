import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { LanggraphService } from './langgraph.service.js';
import { ArticleService } from './article/article.service.js';

@Controller('langgraph')
export class LanggraphController {
  constructor(private readonly langgraphService: LanggraphService, private readonly ArticleService: ArticleService) { }

  // 简单回答
  @Post('simple')
  async simpleAnswer(@Body() body: { message: string }) {
    return this.langgraphService.simpleInvoke(body.message);
  }

  // 带记忆的回答
  @Post('memory')
  async memoryAnswer(@Body() body: { message: string, threadId: string }) {
    return this.langgraphService.memoryInvoke(body.message, body.threadId);
  }

  // 获取历史回话
  @Get('history/:threadId')
  async getHistory(@Param() params: { threadId: string }) {
    return this.langgraphService.getHistory(params.threadId)
  }

  @Post('article')
  async article(@Body() body: { article: string }) {
    return this.ArticleService.processArticle(body.article);
  }

}
