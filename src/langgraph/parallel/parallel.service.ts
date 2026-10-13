import { ChatOllama } from '@langchain/ollama';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { config } from '../../config/llm.config.js';
import { Annotation, Command, END, Send, START, StateGraph } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';

// 并行执行状态
const ParallelState = Annotation.Root({
  task: Annotation<string>(),
  result: Annotation<Array<{ task: string, result: string }>>({
    reducer: (state, update) => {
      return [...state, ...update]
    },
    default: () => []
  }),
  finalRespone: Annotation<string>()
})

// 子节点状态
const SubState = Annotation.Root({
  task: Annotation<string>(),
})

@Injectable()
export class ParallelService implements OnModuleInit {

  private graph: any

  onModuleInit() {
    const llm = new ChatOllama({
      model: config.ollama.model,
      baseUrl: config.ollama.host,
      temperature: config.ollama.temperature,
      think: false,
      numPredict: 512
    })

    // 拆分任务
    const splitTask = async (state: typeof ParallelState.State) => {
      const prompt = `请将以下任务拆分成多个子任务，每个子任务一行，不要有其他内容：\n${state.task}`
      const response = await llm.invoke([new HumanMessage(prompt)])
      const tasks = response.content.toString().split('\n').filter(Boolean)
      return new Command({
        goto: tasks.map(task => new Send('processTask', { task }))
      })
    }

    // 处理子任务
    const processTask = async (state: typeof SubState.State) => {
      const prompt = `请处理以下任务：\n${state.task}，要求100字以内。`
      const response = await llm.invoke([new HumanMessage(prompt)])
      return {
        result: [{ task: state.task, result: response.content.toString() }]
      }
    }

    // 汇总结果
    const summarize = async (state: typeof ParallelState.State) => {
      const prompt = `请汇总以下任务的结果：\n${state.result.map(r => `${r.task}: ${r.result}`).join('\n')}`
      const response = await llm.invoke([new HumanMessage(prompt)])
      return {
        finalRespone: response.content.toString()
      }
    }

    this.graph = new StateGraph(ParallelState)
      .addNode('splitTask', splitTask, { ends: ['processTask'] })
      .addNode('processTask', processTask, { ends: ['summarize'] })
      .addNode('summarize', summarize)
      .addEdge(START, 'splitTask')
      .addEdge(['processTask'], 'summarize')
      .addEdge('summarize', END)
      .compile()
  }

  async run(task: string) {
    const t0 = Date.now()
    const result = await this.graph.invoke({ task })
    const tc = Date.now() - t0
    return {
      success: true,
      tasks: result.result,
      result: result.finalRespone,
      time: `总耗时: ${tc}ms`
    }
  }
}
