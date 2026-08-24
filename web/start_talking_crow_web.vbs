Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c """ & currentDir & "\start_talking_crow_web.bat""", 0
Set WshShell = Nothing
