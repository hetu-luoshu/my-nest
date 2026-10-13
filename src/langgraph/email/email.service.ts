import { ChatOllama } from '@langchain/ollama';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { config } from '../../config/llm.config.js';
import { Annotation, Command, END, interrupt, MemorySaver, START, StateGraph } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';

const EmailState = Annotation.Root({
  emailReq: Annotation<string>(),
  draftEmail: Annotation<{ subject: string, body: string, recipient: string }>(),
  approvalStatus: Annotation<'pending' | 'approved' | 'rejected' | 'needs_modify'>(),
  modifyFeedback: Annotation<string>(),
  revisionCount: Annotation<number>({
    reducer: (prev) => prev + 1,
    default: () => 0
  }),
  finalStatus: Annotation<string>()
})

@Injectable()
export class EmailService implements OnModuleInit {

  private graph: any

  onModuleInit() {
    const llm = new ChatOllama({
      model: config.ollama.model,
      baseUrl: config.ollama.host,
      temperature: config.ollama.temperature,
      think: false,
      numPredict: 512
    })

    // 邮件内容生成节点
    const draftNode = async (state: typeof EmailState.State) => {

      const { modifyFeedback, emailReq, draftEmail } = state

      const isRevision = Boolean(modifyFeedback)

      const prompt = isRevision ?
        `根据一下反馈修改邮件内容：\n\n 修改反馈：${modifyFeedback}\n\n 原始内容：${emailReq}\n\n 当前草稿：${draftEmail}\n\n`
        :
        `请根据以下需求起草一封邮件： ${state.emailReq}`

      const response = await llm.invoke(
        [new HumanMessage(`${prompt} \n\n 请输出对应的JSON格式（别不要输出）：{"subject": "邮件主题", "body": "邮件正文", "recipient": "收件人",}`)]
      )

      let draft: { subject: string, body: string, to: string, from: string }

      try {
        const content = (response.content as string) ?? '{}'
        draft = JSON.parse(content.replace(/```json|```/g, '').trim())
      } catch (error) {
        draft = {
          subject: '邮件主题',
          body: '邮件正文',
          to: '收件人',
          from: '发件人'
        }
      }

      return {
        draftEmail: draft,
        approvalStatus: 'pending',
        revisionCount: 0,
        finalStatus: isRevision ? '修改中' : '待审核'
      }
    }

    // 人工审批节点
    const approvalNode = async (state: typeof EmailState.State) => {

      const { draftEmail, approvalStatus, revisionCount } = state

      const decision = interrupt({
        type: 'email_review',
        message: `请审核以下邮件草稿内容：\n\n 
          主题：${draftEmail.subject}\n\n 
          正文：${draftEmail.body}\n\n 
          收件人：${draftEmail.recipient}\n\n
          当前状态：${approvalStatus}\n\n
          第 ${revisionCount + 1} 次修改\n\n
        `,
        options: {
          approved: '批准',
          rejected: '拒绝',
          modify: '需要修改'
        }
      })

      // 判断人工审核结果
      if (typeof decision === 'string' && decision === 'approved') {
        return {
          approvalStatus: decision
        }
      }
      if (typeof decision === 'object' && decision.action === 'modify') {
        return {
          approvalStatus: 'needs_modify',
          modifyFeedback: decision.feedback
        }
      }
      return {
        approvalStatus: 'rejected'
      }
    }

    // 路由节点
    const routeAfterApproval = (state: typeof EmailState.State) => {
      const { approvalStatus } = state

      switch (approvalStatus) {
        case 'approved':
          return 'sendNode'
        case 'needs_modify':
          return 'draftNode'
        default:
          return 'cancelNode'
      }
    }

    const sendNode = async (state: typeof EmailState.State) => {
      const { draftEmail } = state
      return {
        finalStatus: `邮件已发送，主题：${draftEmail.subject} -> 收件人：${draftEmail.recipient}`
      }
    }

    const cancelNode = async (state: typeof EmailState.State) => {
      const { approvalStatus } = state
      return {
        finalStatus: `邮件已取消 - 审批状态：${approvalStatus}`
      }
    }

    this.graph = new StateGraph(EmailState)
      .addNode('draftNode', draftNode)
      .addNode('approvalNode', approvalNode)
      .addNode('sendNode', sendNode)
      .addNode('cancelNode', cancelNode)
      .addEdge(START, 'draftNode')
      .addEdge('draftNode', 'approvalNode')
      .addConditionalEdges('approvalNode', routeAfterApproval, {
        sendNode: 'sendNode',
        draftNode: 'draftNode',
        cancelNode: 'cancelNode'
      })
      .addEdge('sendNode', END)
      .addEdge('cancelNode', END)
      .compile({ checkpointer: new MemorySaver() })
  }

  async send(emailReq: string, threadId: string) {
    const config = { configurable: { thread_id: threadId } }
    const result = await this.graph.invoke({ emailReq }, config)

    if (result.__interrupt__) {
      return {
        status: 'pending_approval',
        threadId,
        draft: result.draftEmail,
        reviewData: result.__interrupt__[0].value,
        message: '邮件草稿已生成，等待人工审核'
      }
    }

    return {
      status: 'completed',
      threadId,
      result: result.finalStatus,
      message: '邮件处理完成'
    }
  }

  async approve(threadId: string) {
    const config = { configurable: { thread_id: threadId } }

    await this.graph.invoke(new Command({ resume: 'approved' }), config)

    const res = await this.graph.getState(config)

    return {
      status: 'email_send',
      threadId,
      result: res.values.finalStatus
    }
  }

  async reject(threadId: string) {
    const config = { configurable: { thread_id: threadId } }

    await this.graph.invoke(new Command({ resume: 'rejected' }), config)

    const res = await this.graph.getState(config)

    return {
      status: 'cancelled',
      message: '邮件已取消',
      result: res.values.finalStatus
    }
  }

  async modify(threadId: string, feedback: string) {
    const config = { configurable: { thread_id: threadId } }
    const res = await this.graph.invoke(new Command({ resume: { action: 'modify', feedback } }), config)

    if (res.__interrupt__) {
      return {
        status: 'pending_approval',
        threadId,
        draft: res.draftEmail,
        reviewData: res.__interrupt__[0].value,
        message: '邮件草稿已修改，等待人工审核'
      }
    }
    return {
      status: 'completed',
      threadId,
      result: res.finalStatus,
      message: '邮件处理完成'
    }
  }

  async getState(threadId: string) {
    const config = { configurable: { thread_id: threadId } }
    const res = await this.graph.getState(config)
    return {
      threadId,
      current: res.values,
      message: `当前审核状态：${res.values.approvalStatus} - 修改次数：${res.values.revisionCount}`
    }
  }
}
