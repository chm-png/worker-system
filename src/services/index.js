/**
 * 服务层索引文件 - 统一导出所有服务
 */
import userService from './userService'
import chatService from './chatService'
import taskService from './taskService'
import employeeService from './employeeService'

export {
  userService,
  chatService,
  taskService,
  employeeService
}

export default {
  user: userService,
  chat: chatService,
  task: taskService,
  employee: employeeService
}