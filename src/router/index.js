import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/admin/Layout.vue'),
    meta: { requiresAuth: true, role: 'admin' },
    children: [
      {
        path: '',
        redirect: 'attendance'
      },
      {
        path: 'attendance',
        name: 'AdminAttendance',
        component: () => import('@/views/admin/Attendance.vue'),
        meta: { title: '考勤统计' }
      },
      {
        path: 'tasks',
        name: 'AdminTasks',
        component: () => import('@/views/admin/Tasks.vue'),
        meta: { title: '任务派发' }
      },
      {
        path: 'employees',
        name: 'AdminEmployees',
        component: () => import('@/views/admin/Employees.vue'),
        meta: { title: '员工管理' }
      }
    ]
  },
  {
    path: '/worker',
    name: 'Worker',
    component: () => import('@/views/worker/Layout.vue'),
    meta: { requiresAuth: true, role: 'worker' },
    children: [
      {
        path: '',
        redirect: 'tasks'
      },
      {
        path: 'tasks',
        name: 'WorkerTasks',
        component: () => import('@/views/worker/Tasks.vue'),
        meta: { title: '工作任务' }
      },
      {
        path: 'chat',
        name: 'WorkerChat',
        component: () => import('@/views/worker/Chat.vue'),
        meta: { title: '即时通讯' }
      }
    ]
  },
  {
    path: '*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue')
  }
]

const router = new VueRouter({
  mode: 'hash',
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = sessionStorage.getItem('token')
  
  if (to.meta.requiresAuth !== false) {
    if (!token) {
      next('/login')
      return
    }
    
    // 检查角色权限
    if (to.meta.role) {
      const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}')
      if (userInfo.role !== to.meta.role) {
        // 如果是管理员访问员工页面或反之，重定向到对应首页
        if (userInfo.role === 'admin') {
          next('/admin')
        } else {
          next('/worker')
        }
        return
      }
    }
  }
  
  next()
})

export default router
