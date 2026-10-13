import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { LanggraphService } from './langgraph.service.js';
import { ArticleService } from './article/article.service.js';
import { ReasoningAgentService } from './reasoning-agent/reasoning-agent.service.js'
import { RoutingService } from './routing/routing.service.js'
import { ParallelService } from './parallel/parallel.service.js';
import { SupervisorService } from './supervisor/supervisor.service.js';
import { PipelineService } from './pipeline/pipeline.service.js';
import { CodeReviewService } from './code-review/code-review.service.js';
import { EmailService } from './email/email.service.js';

@Controller('langgraph')
export class LanggraphController {
  constructor(
    private readonly langgraphService: LanggraphService,
    private readonly articleService: ArticleService,
    private readonly reasoningAgentService: ReasoningAgentService,
    private readonly routingService: RoutingService,
    private readonly parallelService: ParallelService,
    private readonly supervisorService: SupervisorService,
    private readonly pipelineService: PipelineService,
    private readonly codeReviewService: CodeReviewService,
    private readonly emailService: EmailService,
  ) { }

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
    return this.articleService.processArticle(body.article);
  }

  @Post('reasoning')
  async reasoning(@Body() body: { message: string, threadId: string }) {
    return this.reasoningAgentService.reasoningActing(body.message, body.threadId);
  }

  @Post('route')
  async route(@Body() body: { input: string }) {
    return this.routingService.routeChat(body.input)
  }

  // 并行任务
  @Post('parallel')
  async parallel(@Body() body: { input: string }) {
    return this.parallelService.run(body.input)
  }

  // 监督者任务
  @Post('supervisor')
  async supervisor(@Body() body: { input: string }) {
    return this.supervisorService.run(body.input)
  }

  // 流水线任务
  @Post('pipeline')
  async pipeline(@Body() body: { topic: string }) {
    return this.pipelineService.run(body.topic)
  }

  @Post('codereview')
  async codereview(@Body() body: { code: string, language: string }) {
    return this.codeReviewService.review(body.code, body.language)
  }

  @Post('send-email')
  async sendEmail(@Body() body: { text: string, threadId: string }) {
    return this.emailService.send(body.text, body.threadId)
  }

  @Post('approve-email')
  async approveEmail(@Body() body: { threadId: string }) {
    return this.emailService.approve(body.threadId)
  }

  @Post('reject-email')
  async rejectEmail(@Body() body: { threadId: string }) {
    return this.emailService.reject(body.threadId)
  }

  @Post('modify-email')
  async modifyEmail(@Body() body: { threadId: string, text: string }) {
    return this.emailService.modify(body.threadId, body.text)
  }

  @Get('email-status/:threadId')
  async getEmailStatus(@Param() params: { threadId: string }) {
    return this.emailService.getState(params.threadId)
  }
}
