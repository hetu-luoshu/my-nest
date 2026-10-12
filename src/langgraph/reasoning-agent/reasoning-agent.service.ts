import { tool } from '@langchain/core/tools';
import { ChatOllama } from '@langchain/ollama';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { z } from 'zod'
import { config } from '../../config/llm.config.js';
import { END, MemorySaver, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

// 工具

// 工具一：计算器，输入表达式，执行输出结果
const calc = tool(async ({ expression }) => {
  const result = Function(`'use strict';return ${expression}`)

  return `计算结果：${expression} = ${result()}`
}, {
  name: 'calc_tool',
  description: '计算器，输入表达式，执行输出结果',
  schema: z.object({
    expression: z.string().describe('表达式 ，如 1+1')
  })
})

// 工具二：查询天气，模拟城市天气
const weather = tool(async ({ city }) => {
  const mock = {
    '北京': '晴 25℃',
    '上海': '阴 28℃',
    '广州': '雨 30℃',
    '深圳': '多云 29℃',
    '杭州': '晴 26℃',
    '成都': '阴 27℃',
    '重庆': '雨 28℃',
    '武汉': '晴 29℃',
    '南京': '阴 28℃',
  }
  return `${city}的天气是：${mock[city as keyof typeof mock] || '未知'}`
}, {
  name: 'weather_tool',
  description: '查询天气，模拟城市天气',
  schema: z.object({
    city: z.string().describe('城市')
  })
})

const tools = [calc, weather]


@Injectable()
export class ReasoningAgentService implements OnModuleInit {

  private graph: any

  onModuleInit() {
    const llm = new ChatOllama({
      model: config.ollama.model,
      baseUrl: config.ollama.host,
      temperature: config.ollama.temperature,
      think: false,
      numPredict: 512
    })

    // 绑定工具到模型
    const llmWithTools = llm.bindTools(tools)

    // 工具节点：执行工具
    const toolNode = new ToolNode(tools)

    // 模型节点：调用模型
    const callModel = async (state: typeof MessagesAnnotation.State) => {
      const messages = [
        new SystemMessage(`你是一个智能助手，可以使用工具来帮助用户解决问题。
          你可以使用以下工具：
          - calc_tool: 计算器，输入表达式，执行输出结果
          - weather_tool: 查询天气，模拟城市天气
          请根据用户的问题，选择合适的工具来解决问题。
        `),
        ...state.messages
      ]

      const response = await llmWithTools.invoke(messages)
      return { messages: [response] }
    }

    // 判断是否需要调用工
    const shouldContinue = (state: typeof MessagesAnnotation.State) => {
      const lastMessage = state.messages.at(-1) as AIMessage

      return lastMessage.tool_calls?.length ? 'tools' : END
    }

    // 构建图
    this.graph = new StateGraph(MessagesAnnotation)
      .addNode('callModel', callModel)
      .addNode('tools', toolNode)
      .addEdge(START, 'callModel')
      .addConditionalEdges('callModel', shouldContinue, ['tools', END])
      .addEdge('tools', 'callModel')
      .compile({ checkpointer: new MemorySaver() })
  }

  async reasoningActing(message: string, threadId: string) {
    const result = await this.graph.invoke({
      messages: [
        new HumanMessage(message)
      ]
    }, {
      configurable: { thread_id: threadId }
    })

    return {
      success: true,
      result: result.messages.at(-1).content,
    }
  }
}
