
Set WshShell = CreateObject("WScript.Shell")

' 先杀掉所有旧 Node 进程（关键！解决端口+1）
WshShell.Run "taskkill /f /im node.exe", 0

' 等待1秒再启动
WScript.Sleep 1000

' 启动后端
WshShell.Run "cmd /k cd /d C:\Users\ch'm\Desktop\worker-system\src && npm run dev", 0

' 启动前端
WshShell.Run "cmd /k cd /d C:\Users\ch'm\Desktop\worker-system\server && npm run dev", 0

' 等待8秒等服务启动
WScript.Sleep 8000
