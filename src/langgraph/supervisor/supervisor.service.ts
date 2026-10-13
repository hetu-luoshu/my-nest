import { ChatOllama } from '@langchain/ollama';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { config } from '../../config/llm.config.js';
import { Annotation, END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';


// 监督者状态
const supervisorState = Annotation.Root({
  messages: MessagesAnnotation.spec.messages,
  nextAgent: Annotation<string>(),
  completedAgents: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
    default: () => []
  })
})

@Injectable()
export class SupervisorService implements OnModuleInit {
  private graph: any
  onModuleInit() {
    const llm = new ChatOllama({
      model: config.ollama.model,
      baseUrl: config.ollama.host,
      temperature: config.ollama.temperature,
      think: false,
      numPredict: 512
    })

    const supervisor = async (state: typeof supervisorState.State) => {
      const { messages, completedAgents } = state

      const done = completedAgents.length
        ? `已完成：${completedAgents.join(', ')}`
        : '暂无已完成的任务'

      const systemPrompt = `你是一个任务协调者，管理以下Agnet：

        - researcher: 负责信息检索
        - analyst: 负责数据分析
        - writer: 负责内容撰写
        
        1、根据用户请求，决定下一步应该由哪个Agent处理。
        2、${done}
        3、如果所有任务都已完成，返回"FINISH"。
        4、只返回Agent名称或FINISH，不要其他内容。

        可选值：researcher, analyst, writer, FINISH
      `
      const res = await llm.invoke([
        new SystemMessage(systemPrompt),
        ...messages
      ])

      const validAgents = ['researcher', 'analyst', 'writer', 'FINISH']
      const nextAgent = validAgents.includes(res.content.toString().trim()) ? res.content.toString().trim() : 'FINISH'
      return {
        nextAgent,
        messages: [new AIMessage(`[Supervisor] 下一步决定调用：${nextAgent} Agent`)]
      }
    }

    // 路由函数
    const routeToAgent = (state: typeof supervisorState.State) => {
      return state.nextAgent === 'FINISH' ? END : state.nextAgent
    }

    const createWokrer = (name: string, systemPrompt: string) => {
      return async (state: typeof supervisorState.State) => {
        // 用户原始请求
        const userMsg = state.messages.find(m => m instanceof HumanMessage)?.content || ''
        const context = state.messages.map(m => m.content).join('\n')
        const res = await llm.invoke([
          new SystemMessage(systemPrompt),
          new HumanMessage(`用户请求（原始任务）：${userMsg}\n\n上下文：${context}`)
        ])
        return {
          messages: [new AIMessage(`[${name}] ${res.content}`)],
          completedAgents: [name]
        }
      }
    }

    this.graph = new StateGraph(supervisorState)
      .addNode('supervisor', supervisor)
      .addNode('researcher', createWokrer('researcher', '你是一个信息检索专家，负责查找和整理相关信息。'))
      .addNode('analyst', createWokrer('analyst', '你是一个数据分析专家，负责分析数据并提供见解。'))
      .addNode('writer', createWokrer('writer', '你是一个内容撰写专家，负责撰写清晰、准确的内容。'))
      .addEdge(START, 'supervisor')
      .addConditionalEdges('supervisor', routeToAgent, {
        researcher: 'researcher',
        analyst: 'analyst',
        writer: 'writer',
        [END]: END
      })
      .addEdge('researcher', 'supervisor')
      .addEdge('analyst', 'supervisor')
      .addEdge('writer', 'supervisor')
      .compile()
  }

  async run(input: string) {
    const result = await this.graph.invoke({
      messages: [new HumanMessage(input)]
    }, {
      recursionLimit: 10
    })
    return {
      messages: result.messages.map((m: any) => m.content),
      completedAgents: result.completedAgents,
    }
  }

}
