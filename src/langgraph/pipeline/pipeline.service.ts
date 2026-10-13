import { ChatOllama } from '@langchain/ollama';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { config } from '../../config/llm.config.js';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import { success } from 'zod';

// 流水线状态
const PipelineState = Annotation.Root({
  topic: Annotation<string>(),
  research: Annotation<string>(),
  outline: Annotation<string>(),
  draft: Annotation<string>(),
  final: Annotation<string>(),
  steps: Annotation<string[]>({
    reducer: (a, b) => a.concat(b),
    default: () => []
  }),
})

@Injectable()
export class PipelineService implements OnModuleInit {

  private graph: any

  onModuleInit() {
    const llm = new ChatOllama({
      model: config.ollama.model,
      baseUrl: config.ollama.host,
      temperature: config.ollama.temperature,
      think: false,
      numPredict: 512
    })

    // 根据主题 topic 收集资料
    const researchAgent = async (state: typeof PipelineState.State) => {
      const prompt = `你是一个研究者。请针对以下主题收集关键信息和事实：\n\n主题：${state.topic}\n\n请提供简洁的研究摘要：
        1. 背景介绍（2-3句话）
        2. 关键要点（3-5个）
        3. 相关数据或案例
        每条不超过 50 字，请用中文回答
      `
      const response = await llm.invoke([new HumanMessage(prompt)])
      return {
        research: response.content as string,
        steps: ['收集资料完成']
      }
    }

    // 根据资料 research 生成大纲 outline
    const outlineAgent = async (state: typeof PipelineState.State) => {
      const prompt = `你是一个大纲生成器。请根据以下资料生成一个文章大纲：\n\n资料：${state.research}\n\n请提供简洁的大纲：
        1. 标题
        2. 引言
        3. 正文（3-5个要点）
        4. 结论
        每条不超过 20 字，请用中文回答
      `
      const response = await llm.invoke([new HumanMessage(prompt)])
      return {
        outline: response.content as string,
        steps: ['生成大纲完成']
      }
    }

    // 根据 主题 topic 大纲 outline 和 参考材料 research 生成草稿 draft
    const writerAgent = async (state: typeof PipelineState.State) => {
      const { topic, outline, research } = state
      const prompt = `你是一个写作者。请根据以下主题、大纲和参考资料生成一篇文章草稿(500-800字)：\n\n
        主题：${topic}\n\n
        大纲：${outline}\n\n
        参考资料：${research}\n\n
      `
      const response = await llm.invoke([new HumanMessage(prompt)])
      return {
        draft: response.content as string,
        steps: ['生成草稿完成']
      }
    }

    // 根据草稿 draft 生成最终文章 final
    const editorAgent = async (state: typeof PipelineState.State) => {
      const prompt = `你是一个编辑。请根据以下草稿优化后生成文章：\n\n草稿：${state.draft}`
      const response = await llm.invoke([new HumanMessage(prompt)])
      return {
        final: response.content as string,
        steps: ['生成最终文章完成']
      }
    }

    this.graph = new StateGraph(PipelineState)
      .addNode('researchAgent', researchAgent)
      .addNode('outlineAgent', outlineAgent)
      .addNode('writerAgent', writerAgent)
      .addNode('editorAgent', editorAgent)
      .addEdge(START, 'researchAgent')
      .addEdge('researchAgent', 'outlineAgent')
      .addEdge('outlineAgent', 'writerAgent')
      .addEdge('writerAgent', 'editorAgent')
      .addEdge('editorAgent', END)
      .compile()
  }

  async run(topic: string) {
    const t0 = Date.now()
    const result = await this.graph.invoke({
      topic,
    })
    const t1 = Date.now()
    return {
      success: true,
      steps: result.steps,
      research: result.research,
      outline: result.outline,
      draft: result.draft,
      data: result.final,
      duration: `总耗时：${t1 - t0}ms`
    }
  }
}
