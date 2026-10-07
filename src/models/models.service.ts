import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama'
import { config } from '../config/llm.config.js';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';

@Injectable()
export class ModelsService {

  private readonly llm = new ChatOllama({
    model: config.ollama.model,
    baseUrl: config.ollama.host,
    temperature: config.ollama.temperature,
  })

  async baseChat(message: string) {

    const resp = await this.llm.invoke([
      new HumanMessage(message)
    ])

    return {
      question: message,
      answer: resp.content,
      usage: resp.usage_metadata
    };
  }

  async systemChat(message: string, system: string) {
    const resp = await this.llm.invoke([
      new SystemMessage(system),
      new HumanMessage(message),
    ])

    return {
      system: system,
      question: message,
      answer: resp.content,
      usage: resp.usage_metadata,
    }
  }

  async streamChat(message: string, onData: (data: any, done?: boolean) => void) {
    const stream = await this.llm.stream([
      new HumanMessage(message)
    ]);

    for await (const chunk of stream) {
      onData(chunk.content, chunk?.response_metadata?.done as boolean | undefined);
    }
  }

  async chatWithParser(message: string) {

    const chain = this.llm.pipe(new StringOutputParser());

    chain.invoke([
      new HumanMessage(message)
    ]);

    const answer = await chain.invoke([
      new HumanMessage(message)
    ]);

    return {
      question: message,
      answer,
    }
  }

  async streamWithParser(message: string, onData: (data: any, done?: boolean) => void) {

    const chain = this.llm.pipe(new StringOutputParser());

    const stream = await chain.stream([
      new HumanMessage(message)
    ]);

    for await (const chunk of stream) {
      onData(chunk);
    }

    onData(null, true); // Indicate that the streaming is done
  }
} 
