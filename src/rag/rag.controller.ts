import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { RagService } from './rag.service.js';

@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) { }

  @Post('load')
  async load(@Body() body: { docs: { id: string; content: string; source?: string }[] }) {
    return this.ragService.loadDocuments(body.docs);
  }

  @Get('status')
  async status() {
    return this.ragService.getStatus();
  }

  @Post('search')
  async query(@Body() body: { question: string; topK?: number }) {
    return this.ragService.seacrh(body.question, body.topK);
  }

  @Post('query')
  async queryWithLLM(@Body() body: { question: string; topK?: number }) {
    return this.ragService.query(body.question, body.topK);
  }

  @Delete('clear')
  async clear() {
    return this.ragService.clear();
  }
}
