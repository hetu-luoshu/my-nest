import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UserModule } from './user/user.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PostModule } from './post/post.module.js';
import { ConfigModule } from '@nestjs/config';
import { ModelsModule } from './models/models.module.js';
import { PromptsModule } from './prompts/prompts.module.js';
import { ChainsModule } from './chains/chains.module.js';
import { AgentsModule } from './agents/agents.module.js';
import { MemoryModule } from './memory/memory.module.js';
import { RagModule } from './rag/rag.module.js';
import { FunctionCallingModule } from './function-calling/function-calling.module.js';
import { RagDbModule } from './rag-db/rag-db.module.js';
import { McpClientModule } from './mcp-client/mcp-client.module.js';
import { McpAgentModule } from './mcp-agent/mcp-agent.module.js';

@Module({
  imports: [UserModule, PrismaModule, PostModule,
    /**
     * Config module for global configuration
     * env variables can be accessed from anywhere in the application
     */
    ConfigModule.forRoot({
      isGlobal: true,
    }), ModelsModule, PromptsModule, ChainsModule, AgentsModule, MemoryModule, RagModule, FunctionCallingModule, RagDbModule, McpClientModule, McpAgentModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
