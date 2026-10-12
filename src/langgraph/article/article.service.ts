import { ChatOllama } from '@langchain/ollama';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { config } from '../../config/llm.config.js';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';


// 自定义 State
const ArticleState = Annotation.Root({
  // 原始文章
  article: Annotation<string>(),
  // 关键词提取
  keywords: Annotation<string[]>({
    reducer: (prev, curr) => [...prev, ...curr],
    default: () => []
  }),
  // 摘要
  summary: Annotation<string>(),
  // 日志
  log: Annotation<string[]>()
})

@Injectable()
export class ArticleService implements OnModuleInit {

  private graph: any;

  onModuleInit() {
    const llm = new ChatOllama({
      model: config.ollama.model,
      baseUrl: config.ollama.host,
      temperature: config.ollama.temperature,
      think: false,
      numPredict: 512
    })

    // 节点一：提取关键词
    const extractKeywords = async (state: typeof ArticleState.State) => {
      const prompt = `请从以下文章中提取3-5个关键词，用逗号分隔：\n\n${state.article}`;
      const startTime = Date.now();
      const response = await llm.invoke(prompt);
      const keywords = response.content.toString().split(',').map(k => k.trim());
      return { keywords, log: [`提取关键词耗时: ${Date.now() - startTime}ms`] };
    }

    // 节点二：生成摘要
    const generateSummary = async (state: typeof ArticleState.State) => {
      const prompt = `请为以下文章生成一段简短的摘要：\n\n${state.article}`;
      const startTime = Date.now();
      const response = await llm.invoke(prompt);
      return { summary: response.content.toString(), log: [...state.log, `生成摘要耗时: ${Date.now() - startTime}ms`] };
    }

    // 节点三：记录日志
    const logStep = async (state: typeof ArticleState.State) => {
      return { log: [...state.log, `处理完成`] };
    }


    // 构建图
    this.graph = new StateGraph(ArticleState)
      .addNode('extractKeywords', extractKeywords)
      .addNode('generateSummary', generateSummary)
      .addNode('logStep', logStep)
      .addEdge(START, 'extractKeywords')
      .addEdge('extractKeywords', 'generateSummary')
      .addEdge('generateSummary', 'logStep')
      .addEdge('logStep', END)
      .compile();
  }

  // 处理文章
  async processArticle(article: string) {
    const result = await this.graph.invoke({ article });
    return {
      keywords: result.keywords,
      summary: result.summary,
      log: result.log,
    };
  }
}
