import { ChatOllama } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { config } from '../config/llm.config.js';
import { tool } from '@langchain/core/tools';
import { z } from 'zod'
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';


@Injectable()
export class AgentsService {

  private readonly llm = new ChatOllama({
    model: config.ollama.model,
    baseUrl: config.ollama.host,
    temperature: config.ollama.temperature,
  })

  // 检查商品
  private checkProductTools = tool(
    async ({ name }: { name: string }) => {
      const products = [
        { name: 'iPhone 15', price: 1000, stock: 10 },
        { name: 'iPhone 15 Pro', price: 1200, stock: 5 },
        { name: 'iPhone 15 Pro Max', price: 1400, stock: 3 },
        { name: 'xiaomi 15', price: 1000, stock: 10 },
        { name: 'xiaomi 15 Pro', price: 1200, stock: 5 },
        { name: 'xiaomi 15 Pro Max', price: 1400, stock: 3 },
        { name: 'Samsung S24', price: 1000, stock: 10 },
        { name: 'Samsung S24 Pro', price: 1200, stock: 5 },
        { name: 'Samsung S24 Pro Max', price: 1400, stock: 3 },
      ]

      const product = products.find((product) => product.name === name)

      if (!product) {
        return `没有找到${name}商品的信息`
      }
      // 判断库存，如果没有可以推荐其他商品
      if (product.stock === 0) {
        const otherProducts = products.filter((product) => product.stock > 0)
        return `该商品暂时没有库存，推荐其他商品：${otherProducts.map((product) => product.name).join(',')}`
      }
      return `该商品的价格是${product.price}元，库存是${product.stock}件`
    },
    {
      name: 'check_product',
      description: '查询商品信息的工具，输入商品名称，返回商品的价格和库存信息',
      schema: z.object({
        name: z.string().describe('商品名称'),
      }),
    }
  )

  // 创建订单
  private createOrderTools = tool(
    async ({ productName, quantity, username }: { productName: string, quantity: number, username: number }) => {
      const prices = {
        'iPhone 15': 1000,
        'iPhone 15 Pro': 1200,
        'iPhone 15 Pro Max': 1400,
        'xiaomi 15': 1000,
        'xiaomi 15 Pro': 1200,
        'xiaomi 15 Pro Max': 1400,
        'Samsung S24': 1000,
        'Samsung S24 Pro': 1200,
        'Samsung S24 Pro Max': 1400
      }
      // 计算价格
      const price = (prices[productName as keyof typeof prices] ?? 0) * quantity
      if (!price) {
        return `商品${productName}不存在`
      }
      // 订单号格式 ORDER-${Date.now()}-${username}
      const orderNo = `ORDER-${Date.now()}-${username}`
      return `订单号：${orderNo}，商品名称：${productName}，数量：${quantity}，价格：${price}`
    },
    {
      name: 'create_order',
      description: '创建订单的工具，输入商品名称，数量，用户名，返回订单号',
      schema: z.object({
        productName: z.string().describe('商品名称'),
        quantity: z.number().describe('商品数量'),
        username: z.string().describe('用户名'),
      }),
    }
  )

  // 查询订单
  private queryOrderTools = tool(
    async ({ orderNo }: { orderNo: string }) => {

      // 模拟订单数据和订单状态
      const statuses = ['待支付', '已支付', '待发货', '已发货', '已完成', '已取消']

      const status = statuses[Math.floor(Math.random() * statuses.length)]

      const extra = status === '已取消' ? '订单因库存不足取消了' : ''

      if (!status) {
        return `没有找到订单${orderNo}的信息`
      }
      return `订单号：${orderNo}，状态：${status}，${extra}`
    },
    {
      name: 'query_order',
      description: '查询订单的工具，输入订单号，返回订单状态',
      schema: z.object({
        orderNo: z.string().describe('订单号'),
      }),
    }
  )

  // 申请退款
  private refundTools = tool(
    async ({ orderNo, reason }: { orderNo: string, reason: string }) => {

      // 退款ID
      const refundId = `REFUND-${Date.now()}-${orderNo}`

      return `退款ID：${refundId}，订单号：${orderNo}，退款原因：${reason}，退款申请已提交，请等待审核`
    },
    {
      name: 'refund',
      description: '申请退款的工具，输入订单号，返回退款申请结果',
      schema: z.object({
        orderNo: z.string().describe('订单号'),
        reason: z.string().describe('退款原因'),
      }),
    },
  )

  async runAgent(message: string) {

    const tools = [
      this.checkProductTools,
      this.createOrderTools,
      this.queryOrderTools,
      this.refundTools,
    ]

    const toolMap = {
      check_product: this.checkProductTools,
      create_order: this.createOrderTools,
      query_order: this.queryOrderTools,
      refund: this.refundTools,
    } as Record<string, any>


    const llmWithTools = this.llm.bindTools(tools)

    // 消息历史
    const messages: any[] = [
      new SystemMessage(`你是一个电商客服助手，可以使用工具来帮助用户查询商品信息、创建订单、查询订单、申请退款。
        你可以使用以下工具帮助客户：
        - check_product: 查询商品信息
        - create_order: 创建订单
        - query_order: 查询订单
        - refund: 申请退款
        工作原则：
        1. 先用工具获取真实信息，再给客户回复
        2. 下单前必须先查询库存，确认有货才能下单
        3. 下单必须知道用户名或名字，如果没有提供用户名，需要询问
        4. 回复要简洁友好，用中文回复
`),
      new HumanMessage(message)
    ]

    // 记录一下每步执行的过程（用于调试和日志，前端可以展示）
    const steps: string[] = []
    let roundCount = 0

    while (roundCount < 6) {
      roundCount++
      console.log(`Agent --- 第${roundCount}轮`)

      const response = await llmWithTools.invoke(messages)
      messages.push(response)

      // 如果没有工具调用，说明已经完成
      if (!response.tool_calls || response.tool_calls.length === 0) {
        steps.push(`最终回复：${response.content}`)
        break;
      }

      // 执行工具调用
      for (const toolCall of response.tool_calls) {
        const toolName = toolCall.name
        const toolArgs = toolCall.args
        const tool = toolMap[toolName]

        console.log(`调用工具${toolName}，参数：${JSON.stringify(toolArgs)}`)

        if (!tool) {
          steps.push(`没有找到工具${toolName}`)
          messages.push(new ToolMessage({
            content: `没有找到工具${toolName}`,
            tool_call_id: toolCall.id ?? '',
          }))
          continue
        }
        const toolResult = await tool.invoke(toolArgs)

        console.log(`工具${toolName}返回结果：${toolResult}`)

        steps.push(`调用工具${toolName}，参数：${JSON.stringify(toolArgs)}，结果：${toolResult}`)
        messages.push(new ToolMessage({
          content: toolResult,
          tool_call_id: toolCall.id ?? '',
        }))
      }
    }

    const finalRes = [...messages].reverse().find(m => m instanceof AIMessage)
    return {
      message,
      steps,
      totalRounds: roundCount,
      answer: finalRes?.content ?? '抱歉，我无法回答您的问题'
    }

  }
}
