import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { config } from '../config/llm.config.js';
// 内存向量数据库
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory'
// PG 向量数据库
import { PGVectorStore, DistanceStrategy } from '@langchain/community/vectorstores/pgvector'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { Document } from '@langchain/core/documents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Pool } from 'pg';

@Injectable()
export class RagDbService {

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
  // private vectorStore: MemoryVectorStore | null = null

  private docCount = 0


  // 建立连接池
  private pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    // 连接超时
    connectionTimeoutMillis: 5000
  })

  // PgVectorStore 配置
  private pgVectorConfig = {
    pool: this.pool,
    collectionName: 'rag_knowledge_base',
    collectionTableName: 'langchain_pg_collection',
    tableName: 'langchain_pg_embedding',
    columns: {
      idColumnName: 'id',
      vectorColumnName: 'embedding',
      contentColumnName: 'content',
      metadataColumnName: 'metadata',
    },
    distanceStrategy: 'cosine' as DistanceStrategy,
  }

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
    // this.vectorStore = await MemoryVectorStore.fromDocuments(allDocs, this.embeddings)


    await PGVectorStore.fromDocuments(allDocs, this.embeddings, this.pgVectorConfig)

    this.docCount = allDocs.length

    return {
      success: true,
      chunks: this.docCount,
      documents: docs.length,
      message: `已加载 ${docs.length} 个文档，拆分为 ${this.docCount} 个片段`
    }
  }

  async getStatus() {

    try {
      const res = await this.pool.query('SELECT COUNT(*) FROM langchain_pg_embedding WHERE collection_id = (SELECT uuid FROM langchain_pg_collection WHERE name = $1)', [this.pgVectorConfig.collectionName])
      const count = parseInt(res.rows[0].count, 10)
      return {
        loaded: count > 0,
        chunks: count,
        message: count > 0 ? `已加载 ${count} 个片段` : '暂无文档'
      }
    } catch (error) {
      return {
        loaded: false,
        chunks: 0,
        message: '数据库连接失败'
      }
    }
  }
  /**
     * 纯向量搜索，不调用 LLM，只返回搜索结果
     */
  async seacrh(query: string, topK = 3) {

    const vectorStore = await PGVectorStore.initialize(this.embeddings, this.pgVectorConfig)
    const results = await vectorStore.similaritySearchWithScore(query, topK)
    return results.map(([doc, score]) => ({
      content: doc.pageContent,
      score, // 余弦距离，越小越相似
      similarity: 1 - score, // 余弦相似度，越大越相似
      metadata: doc.metadata
    }))
  }


  /**
   * 正常的RAG查询，调用 LLM 生成回答
   */
  async query(query: string, topK = 3) {
    // 1. 检索相关文档
    const vectorStore = await PGVectorStore.initialize(this.embeddings, this.pgVectorConfig)
    const results = await vectorStore.similaritySearchWithScore(query, topK)

    // 2. 过滤余弦相似度大于 0.8的数据，构建上下文
    const filteredResults = results.filter(([_, score]) => 1 - score > 0.8)
    const context = filteredResults.map(([doc], i) => i + ". " + doc.pageContent).join('\n\n')

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
        score,
        similarity: 1 - score
      }))
    }
  }

  // // 清楚知识库
  clear() {
    this.pool.query('DELETE FROM langchain_pg_embedding WHERE collection_id = (SELECT uuid FROM langchain_pg_collection WHERE name = $1)', [this.pgVectorConfig.collectionName])

    this.pool.query('DELETE FROM langchain_pg_collection WHERE name = $1', [this.pgVectorConfig.collectionName])

    this.docCount = 0

    return { success: true, message: '知识库已清空' }
  }

  // 关闭数据库
  async onModuleDestroy() {

    await this.pool.end()
  }
}

