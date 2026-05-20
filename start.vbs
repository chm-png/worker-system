
Set WshShell = CreateObject("WScript.Shell")

WshShell.Run "cmd /c cd /d C:\Users\ch'm\Desktop\worker-system\server && npm run dev", 0
WshShell.Run "cmd /c cd /d C:\Users\ch'm\Desktop\worker-system\src && npm run dev", 0



