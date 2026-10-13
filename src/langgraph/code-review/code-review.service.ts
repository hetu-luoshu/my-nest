import { ChatOllama } from '@langchain/ollama';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { config } from '../../config/llm.config.js';
import { Annotation, Command, END, Send, START, StateGraph } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';


// 代码审查
const ReviewState = Annotation.Root({
  code: Annotation<string>(),
  language: Annotation<string>(),
  reviewRes: Annotation<Array<{ aspect: string, issues: string[], score: number }>>({
    reducer: (x, y) => x.concat(y),
    default: () => []
  }),
  report: Annotation<string>()
})

const SingleReviewState = Annotation.Root({
  code: Annotation<string>(),
  language: Annotation<string>(),
  aspect: Annotation<string>(),
  prompt: Annotation<string>()
})

@Injectable()
export class CodeReviewService implements OnModuleInit {

  private graph: any

  onModuleInit() {
    const llm = new ChatOllama({
      model: config.ollama.model,
      baseUrl: config.ollama.host,
      temperature: config.ollama.temperature,
      think: false,
      numPredict: 512
    })

    // 分发任务
    const dispatchReview = (state: typeof ReviewState.State) => {
      const outputPrompt = '输出JSON格式：{aspect: string, issues: string[], score: number}'
      const aspects = [
        {
          aspect: '安全',
          prompt: `检查代码中的安全漏洞，如SQL注入、XSS等攻击、敏感信息泄露等问题。\n\n${outputPrompt}`
        },
        {
          aspect: '性能',
          prompt: `检查代码中的性能问题，如循环嵌套、不必要的计算、内存泄漏等问题。\n\n${outputPrompt}`
        },
        {
          aspect: '可读性',
          prompt: `检查代码的可读性问题，如命名不规范、注释不足、代码结构混乱等问题。\n\n${outputPrompt}`
        }
      ]
      return new Command({
        goto: aspects.map(aspect => new Send('reviewAgent', {
          code: state.code,
          language: state.language,
          aspect: aspect.aspect,
          prompt: aspect.prompt
        }))
      })
    }

    // 审查
    const reviewAgent = async (state: typeof SingleReviewState.State) => {
      const { aspect, code, language, prompt } = state
      const res = await llm.invoke([new HumanMessage(`
        你是一个资深的${language}开发工程师，请从${aspect}角度审查以下代码：\n 代码：${code}\n 根据以下要求进行审查输出：${prompt}
      `)])
      let parsed: { issues: string[], score: number }
      try {
        const json = JSON.parse((res.content as string).replace(/```json|```/g, '').trim())
        parsed = json
      } catch (e) {
        parsed = { issues: ['解析失败'], score: 0 }
      }
      return {
        reviewRes: [{ aspect, ...parsed }]
      }
    }

    // 生成报告
    const generateReport = async (state: typeof ReviewState.State) => {
      const { reviewRes } = state

      const avgSorce = reviewRes.reduce((acc, cur) => acc + cur.score, 0) / reviewRes.length
      const report = await llm.invoke([new HumanMessage(`
        你是一个资深的${state.language}开发工程师，请根据以下审查结果生成一份报告：\n 审查结果：${JSON.stringify(reviewRes)}\n 平均分：${avgSorce}
      `)])

      return {
        report: report.content
      }
    }

    this.graph = new StateGraph(ReviewState)
      .addNode('dispatchReview', dispatchReview, { ends: ['reviewAgent'] })
      .addNode('reviewAgent', reviewAgent, { ends: ['generateReport'] })
      .addNode('generateReport', generateReport)
      .addEdge(START, 'dispatchReview')
      .addEdge('reviewAgent', 'generateReport')
      .addEdge('generateReport', END)
      .compile()
  }

  async review(code: string, language: string) {
    const t0 = Date.now()
    const res = await this.graph.invoke({ code, language })
    const t1 = Date.now()
    return {
      ...res,
      time: `代码审查耗时：${t1 - t0}ms`
    }
  }
}
