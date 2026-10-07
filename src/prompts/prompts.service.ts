import { Injectable } from '@nestjs/common';
import { config } from '../config/llm.config.js';
import { ChatOllama } from '@langchain/ollama';
import { ChatPromptTemplate, PromptTemplate, FewShotPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

@Injectable()
export class PromptsService {

  private readonly llm = new ChatOllama({
    model: config.ollama.model,
    baseUrl: config.ollama.host,
    temperature: config.ollama.temperature,
  })

  async translateLang(text: string, lang: string) {
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个翻译助手，只输出结果'],
      ['user', '请将以下内容翻译为{lang}: {text}']
    ]);

    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());

    const translated = await chain.invoke({
      text,
      lang
    });

    return {
      original: text,
      translated
    }
  }
  /**
   * 总结
   */
  async summarize(text: string, maxWords: number = 100) {
    const prompt = ChatPromptTemplate.fromTemplate(
      '请将以下内容总结为不超过{maxWords}个字的摘要: {text}'
    );

    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());

    const summary = await chain.invoke({
      text,
      maxWords
    });

    return {
      original: text,
      summary
    }
  }

  async classify(text: string) {
    // 评价目标
    const examples = [
      {
        text: '这部电影非常精彩，演员的表演也很出色。',
        category: '正面'
      },
      {
        text: '这部电影情节拖沓，演员的表演也很一般。',
        category: '负面'
      },
      {
        text: '这部电影还可以，有些地方还不错。',
        category: '中性'
      }
    ]

    const examplePrompt = PromptTemplate.fromTemplate('输入：{text}\n输出：{category}')

    const fewShotPrompt = new FewShotPromptTemplate({
      examples,
      examplePrompt,
      prefix: '请根据输入的文本内容进行情感分类，输出正面、负面和中性',
      suffix: '输入：{text}\n输出：',
      inputVariables: ['text']
    })

    const formatterPrompt = await fewShotPrompt.format({ text })

    const chain = this.llm.pipe(new StringOutputParser());

    const res = await chain.invoke(formatterPrompt)

    return {
      text,
      label: res
    }
  }

  async codeReview(code: string, language: string = 'javascript') {
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个代码审查助手，只输出结果'],
      ['human', '请对以下{language}代码进行审查，并给出改进建议: {code}']
    ]);

    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());

    const review = await chain.invoke({
      code,
      language
    });

    return {
      code,
      review
    }
  }
}
