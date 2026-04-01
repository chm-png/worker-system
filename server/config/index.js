module.exports = {
  port: process.env.PORT || 3000,
  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/worker_system',
  jwtSecret: process.env.JWT_SECRET || 'zhigongyun_secret_key_2026',
  jwtExpiresIn: 2 * 60 * 60 * 1000, // 2小时
  uploadPath: process.env.UPLOAD_PATH || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 104857600, // 100MB
  defaultAvatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
  // 允许跨域的域名
  corsOrigins: ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:3000'],
  // 打卡时间规则（单位：分钟）
  clockInRules: {
    normalStart: 8 * 60,      // 8:00 (480分钟)
    normalEnd: 8 * 60 + 30,   // 8:30 (510分钟)
    lateEnd: 12 * 60          // 12:00 (720分钟)
  }
}
