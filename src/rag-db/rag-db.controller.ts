import { Body, Controller, Get, Post } from '@nestjs/common';
import { RagDbService } from './rag-db.service.js';

@Controller('rag-db')
export class RagDbController {
  constructor(private readonly ragDbService: RagDbService) { }

  @Post('load')
  async load(@Body() body: { docs: { id: string; content: string; source?: string }[] }) {
    return this.ragDbService.loadDocuments(body.docs);
  }

  @Get('status')
  async status() {
    return this.ragDbService.getStatus();
  }
}
