import { ChatOllama } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { config } from '../../config/llm.config.js';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';

const RoutingState = Annotation.Root({
  input: Annotation<string>(),
  category: Annotation<string>(),
  response: Annotation<string>(),
})

@Injectable()
export class RoutingService {

  private graph: any

  onModuleInit() {
    const llm = new ChatOllama({
      model: config.ollama.model,
      baseUrl: config.ollama.host,
      temperature: config.ollama.temperature,
      think: false,
      numPredict: 512
    })

    // 路由分类器
    const classify = async (state: typeof RoutingState.State) => {
      const prompt = `你是一个智能路由器，负责将用户输入分类到以下类别之一：
        类别：
        - technical: 技术问题、编程、开发相关
        - billing: 账单、支付、退款相关
        - general: 一般咨询、其他问题
        
        只返回类别名称，不要其他内容。

        用户输入：${state.input}
      `
      const response = await llm.invoke([new HumanMessage(prompt)])
      const valid = ['technical', 'billing', 'general']

      return { category: valid.includes(response.content as string) ? response.content as string : 'general' }
    }

    const routerByCategory = (state: typeof RoutingState.State) => {
      return state.category
    }

    const makeHanler = (systemPrompt: string) => {
      return async (state: typeof RoutingState.State) => {
        const response = await llm.invoke([
          new HumanMessage(`${systemPrompt}\n\n用户问题：${state.input}`)
        ])
        return { response: response.content as string }
      }
    }

    this.graph = new StateGraph(RoutingState)
      .addNode('classify', classify)
      .addNode('technical', makeHanler('你是一个技术专家，请回答技术问题'))
      .addNode('billing', makeHanler('你是一个账单专家，请回答账单问题'))
      .addNode('general', makeHanler('你是一个一般咨询专家，请回答一般问题'))
      .addEdge(START, 'classify')
      .addConditionalEdges('classify', routerByCategory, ['technical', 'billing', 'general'])
      .addEdge('technical', END)
      .addEdge('billing', END)
      .addEdge('general', END)
      .compile()
  }

  async routeChat(input: string) {
    const result = await this.graph.invoke({ input })
    return {
      category: result.category,
      response: result.response
    }
  }
}
