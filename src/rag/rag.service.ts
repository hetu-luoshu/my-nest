import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { config } from '../config/llm.config.js';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { Document } from '@langchain/core/documents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

@Injectable()
export class RagService {

  private readonly llm = new ChatOllama({
    model: config.ollama.model,
    baseUrl: config.ollama.host,
    temperature: config.ollama.temperature,
    numPredict: 512
  })

  private readonly embeddings = new OllamaEmbeddings({
    model: config.ollama.embedModel,
    baseUrl: config.ollama.host
  })

  // 内存向量存储
  private vectorStore: MemoryVectorStore | null = null

  private docCount = 0


  async loadDocuments(docs: { id: string; content: string; source?: string }[]) {
    // 文本拆分器
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
      separators: [
        '\n\n',
        '\n',
        '。',
        '！',
        '？',
        '；',
        '，',
        ' ',
        ''
      ]
    })

    const allDocs: Document[] = []

    for (const doc of docs) {
      // 拆分文档小块
      const chunks = await splitter.createDocuments([doc.content], [{ source: doc.source || doc.id, docId: doc.id }])
      allDocs.push(...chunks)
    }

    // 创建向量存储
    // fromDocuments，会自动调用 embeddings.embedDocuments() 将文档向量化
    this.vectorStore = await MemoryVectorStore.fromDocuments(allDocs, this.embeddings)
    this.docCount = allDocs.length

    return {
      success: true,
      chunks: this.docCount,
      documents: docs.length,
      message: `已加载 ${docs.length} 个文档，拆分为 ${this.docCount} 个片段`
    }
  }

  async getStatus() {
    return {
      loaded: this.vectorStore !== null,
      chunks: this.docCount,
      message: this.vectorStore ? `已加载 ${this.docCount} 个片段` : '未加载文档'
    }
  }

  /**
   * 纯向量搜索，不调用 LLM，只返回搜索结果
   */
  async seacrh(query: string, topK = 3) {
    if (!this.vectorStore) {
      throw new Error('请先加载文档')
    }

    /**
     * similaritySearchWithScore 会返回一个数组，数组中的每一项都是一个对象，包含两个属性：
     * 1. pageContent：文档内容
     * 2. metadata：文档元数据
     * 
     * 该工具执行步骤：
     * 1. 将查询文本向量化 embeddings.embedQuery()
     * 2. 计算查询向量与文档向量的相似度（余弦相似度）
     * 3. 返回相似度最高的 topK 个文档
     */
    const results = await this.vectorStore.similaritySearchWithScore(query, topK)

    return {
      query,
      results: results.map(([doc, score]) => ({
        content: doc.pageContent,
        metadata: doc.metadata,
        score // 相似度分数,值越高越相似
      }))
    }
  }

  /**
   * 正常的RAG查询，调用 LLM 生成回答
   */
  async query(query: string, topK = 3) {
    if (!this.vectorStore) {
      throw new Error('请先加载文档')
    }

    // 1. 检索相关文档
    const results = await this.vectorStore.similaritySearchWithScore(query, topK)

    // 2. 构建上下文
    const context = results.map(([doc], i) => i + ". " + doc.pageContent).join('\n\n')

    // 3. 构建提示词
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `你是一个知识库回答助手，严格基于参考资料回答，规则：
        1. 只根据参考资料回答，不能使用资料外的知识
        2. 资料没有相关信息时，回答"根据已有资料无法回答该问题"
        3. 回答要简洁准确，可以引用资料原文
        4. 使用中文回答
        参考资料：
        {context}`],
      ['human', '{query}']]
    )

    // 4. 调用 LLM 生成回答
    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser())
    const response = await chain.invoke({ context, query })

    return {
      query,
      answer: response,
      sources: results.map(([doc, score]) => ({
        content: doc.pageContent,
        metadata: doc.metadata,
        score
      }))
    }
  }

  // 清楚知识库
  clear() {
    this.vectorStore = null
    this.docCount = 0
    return { success: true, message: '知识库已清空' }
  }
}
