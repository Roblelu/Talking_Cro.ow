@echo off
title TalkingCrowBackend
cd backend
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate.bat
set COQUI_TOS_AGREED=1
python app.py
