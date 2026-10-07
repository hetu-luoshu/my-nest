import { ChatOllama } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { config } from '../config/llm.config.js';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables';

@Injectable()
export class ChainsService {
  private readonly llm = new ChatOllama({
    model: config.ollama.model,
    baseUrl: config.ollama.host,
    temperature: config.ollama.temperature,
  })

  async polish(article: string) {
    // 1、分析文中问题和文章主题、风格
    const analysisPrompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个文章分析助手，只输出结果'],
      ['human', '请分析以下文章的主题、风格、问题: {article}']
    ])
    const analysisChain = analysisPrompt.pipe(this.llm).pipe(new StringOutputParser());


    // 2、根据分析结果润色文章
    const polishPrompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个文章润色助手，只输出结果'],
      ['human', '请根据以下分析结果{analysis}，对文章进行润色，这是文章：{article}']
    ])
    const polishChain = polishPrompt.pipe(this.llm).pipe(new StringOutputParser());

    // 3、将分析结果和文章合并
    const chain = RunnableSequence.from([
      {
        analysis: analysisChain,
        article: new RunnablePassthrough() // 保留原文，将文章传递给下一个链
      },
      polishChain
    ])

    const polished = await chain.invoke({ article })

    return {
      article,
      polished
    }
  }

  /**
   * 根据关键词生成博客文章
   * 
   * 关键词 --> 分析关键词 -> 生成大纲 -> 生成文章 -> SEO标题
   * 
   * 返回 大纲、文章、SEO标题
   * 
   * @param keywork 
   */
  async generateBlog(keyworks: string[]) {
    const keyworkStr = keyworks.join(',')

    // 1、分析关键词
    const analysisPrompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个文章分析助手，只输出结果'],
      ['human', '请分析以下关键词：{keyworkStr}']
    ])
    const analysisChain = analysisPrompt.pipe(this.llm).pipe(new StringOutputParser());

    // 2、生成大纲
    const outlinePrompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个文章大纲生成助手，只输出结果'],
      ['human', '请根据以下分析结果{analysis}，生成文章大纲']
    ])
    const outlineChain = outlinePrompt.pipe(this.llm).pipe(new StringOutputParser());

    // 3、生成文章
    const articlePrompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个文章生成助手，只输出结果'],
      ['human', '请根据以下大纲{outline}，生成文章']
    ])
    const articleChain = articlePrompt.pipe(this.llm).pipe(new StringOutputParser());

    // 4、生成SEO标题
    const seoPrompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个SEO标题生成助手，只输出结果'],
      ['human', '请根据以下文章{article}，生成SEO标题']
    ])
    const seoChain = seoPrompt.pipe(this.llm).pipe(new StringOutputParser());

    const analysis = await analysisChain.invoke({ keyworkStr })
    const outline = await outlineChain.invoke({ analysis })
    const article = await articleChain.invoke({ outline })
    const seoTitle = await seoChain.invoke({ article })

    return {
      outline,
      article,
      seoTitle
    }
  }

  /**
   * 条件分支链，判断问题类型，并回答
   * @param question 
   */
  async smartRouter(question: string) {
    const routerPrompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个问题分类助手，判断问题是属于：技术问题-TECH、退款问题-REFUND、订单问题-ORDER、其他-OTHER，只输出分类结果'],
      ['human', '{question}']
    ]).pipe(this.llm).pipe(new StringOutputParser());

    // 根据分类结果，选择不同的回答链，并回答
    const systemMap = {
      TECH: '你是一个技术问题回答助手，只输出结果',
      REFUND: '你是一个退款问题回答助手，只输出结果',
      ORDER: '你是一个订单问题回答助手，只输出结果',
      OTHER: '你是一个其他问题回答助手，只输出结果'
    }

    const category = await routerPrompt.invoke({ question }) as keyof typeof systemMap
    const system = systemMap[category] || systemMap.OTHER
    const answer = await ChatPromptTemplate.fromMessages([
      ['system', system],
      ['human', '{question}']
    ]).pipe(this.llm).pipe(new StringOutputParser()).invoke({ question })

    return {
      question,
      category,
      answer
    }


  }
}
