export class BatchRequest {
  constructor(delay = 100) {
    this.queue = []
    this.timer = null
    this.delay = delay
  }

  add(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject })
      if (!this.timer) {
        this.timer = setTimeout(() => this.execute(), this.delay)
      }
    })
  }

  async execute() {
    if (this.queue.length === 0) return

    const currentQueue = [...this.queue]
    this.queue = []
    this.timer = null

    try {
      const results = await Promise.all(
        currentQueue.map(item => item.request())
      )

      currentQueue.forEach((item, index) => {
        item.resolve(results[index])
      })

      return results
    } catch (error) {
      currentQueue.forEach(item => {
        item.reject(error)
      })
      throw error
    }
  }

  clear() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.queue = []
  }
}

export async function batchRequests(requests) {
  try {
    const results = await Promise.all(requests)
    return results.map(r => r.data)
  } catch (error) {
    console.error('批量请求失败:', error)
    throw error
  }
}