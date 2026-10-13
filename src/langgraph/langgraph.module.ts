import { Module } from '@nestjs/common';
import { LanggraphService } from './langgraph.service.js';
import { LanggraphController } from './langgraph.controller.js';
import { ArticleService } from './article/article.service.js';
import { ReasoningAgentService } from './reasoning-agent/reasoning-agent.service.js';
import { ParallelService } from './parallel/parallel.service.js';
import { RoutingService } from './routing/routing.service.js';
import { SupervisorService } from './supervisor/supervisor.service.js';
import { PipelineService } from './pipeline/pipeline.service.js';
import { CodeReviewService } from './code-review/code-review.service.js';
import { EmailService } from './email/email.service.js';

@Module({
  controllers: [LanggraphController],
  providers: [LanggraphService, ArticleService, ReasoningAgentService, ParallelService, RoutingService, SupervisorService, PipelineService, CodeReviewService, EmailService],
})
export class LanggraphModule { }
