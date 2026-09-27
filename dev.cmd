@echo off
REM Single entry point for local dev. Stops any leftover TravelConnect.Server
REM instance before building, so a rebuild never fails with
REM "TravelConnect.Server.exe ... being used by another process" (MSB3021) and
REM never fails to bind :5110 (AddressInUseException).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server\dev.ps1" %*
