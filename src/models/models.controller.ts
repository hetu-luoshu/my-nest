import { Body, Controller, Post, Res } from '@nestjs/common';
import { ModelsService } from './models.service.js';
import { BasePromptDto, SystemPromptDto } from './dto/chat-prompt.dto.js';
import type { Response } from 'express';

@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) { }

  @Post('chat')
  async baseChat(@Body() { message }: BasePromptDto) {
    return await this.modelsService.baseChat(message);
  }

  @Post('syschat')
  async systemChat(@Body() { message, system }: SystemPromptDto) {
    return await this.modelsService.systemChat(message, system);
  }

  @Post('streamchat')
  async streamChat(@Body() { message }: BasePromptDto, @Res() res: Response) {
    // 配置流响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const onData = (data: string, done?: boolean) => {
      if (done) {
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }
      if (data) {
        res.write('data: ' + JSON.stringify(data) + '\n\n');
      }
    };

    // await this.modelsService.streamChat(message, onData);
    await this.modelsService.streamWithParser(message, onData);
  }

  @Post('parserchat')
  async chatWithParser(@Body() { message }: BasePromptDto) {
    return await this.modelsService.chatWithParser(message);
  }
}
