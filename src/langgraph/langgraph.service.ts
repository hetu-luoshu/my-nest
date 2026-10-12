import { Injectable, OnModuleInit } from '@nestjs/common';
import { END, MemorySaver, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph'
import { ChatOllama } from '@langchain/ollama';
import { config } from '../config/llm.config.js';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

@Injectable()
export class LanggraphService implements OnModuleInit {

  private simpleGraph: any

  private memoryGraph: any

  onModuleInit() {

    const llm = new ChatOllama({
      model: config.ollama.model,
      baseUrl: config.ollama.host,
      temperature: config.ollama.temperature,
      think: false,
      numPredict: 512
    })

    // 工作流一，简单对话
    const simpleCallModel = async (state: typeof MessagesAnnotation.State) => {
      const messages = [
        new SystemMessage('你是一专业的 AI 助手，回答问题简洁明了。'),
        ...state.messages
      ]
      const res = await llm.invoke(messages)
      return { messages: [...messages, res] }
    }
    this.simpleGraph = new StateGraph(MessagesAnnotation)
      .addNode('callModel', simpleCallModel)
      .addEdge(START, 'callModel')
      .addEdge('callModel', END)
      .compile()


    // 工作流二，有记忆的回答
    this.memoryGraph = new StateGraph(MessagesAnnotation)
      .addNode('callModel', simpleCallModel)
      .addEdge(START, 'callModel')
      .addEdge('callModel', END)
      // 添加记忆 保存到内存中，用于多轮对话
      .compile({ checkpointer: new MemorySaver() })
  }


  /**
   * 简单对话
   * @param message 
   * @returns 
   */
  async simpleInvoke(message: string) {
    const result = await this.simpleGraph.invoke({
      messages: [
        new HumanMessage(message)
      ]
    })

    return {
      success: true,
      messages: result.messages,
      answer: result.messages.at(-1).content
    }
  }

  /**
   * 有记忆的回答，多轮对话
   */
  async memoryInvoke(message: string, threadId: string) {
    const result = await this.memoryGraph.invoke({
      messages: [
        new SystemMessage('你是有记忆的，回答要根据上下文'),
        new HumanMessage(message)
      ]
    }, {
      // 指定会话ID，用于区分不同的会话
      configurable: {
        thread_id: threadId
      }
    })

    return {
      success: true,
      threadId: threadId,
      answer: result.messages.at(-1).content,
      messages: result.messages,
    }
  }

  /**
   * 获取历史对话
   */
  async getHistory(threadId: string) {
    const state = await this.memoryGraph.getState({
      configurable: {
        thread_id: threadId
      }
    })
    return {
      success: true,
      threadId: threadId,
      messages: state.values.messages
    }
  }
}
