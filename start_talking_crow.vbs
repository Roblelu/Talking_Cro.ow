Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & "run_backend.bat" & Chr(34), 0, False
WshShell.Run chr(34) & "run_frontend.bat" & Chr(34), 0, False
Set WshShell = Nothing
