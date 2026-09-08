# ── Build stage ─────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY server/TravelConnect.Server/TravelConnect.Server.csproj ./TravelConnect.Server/
RUN dotnet restore "TravelConnect.Server/TravelConnect.Server.csproj"

COPY server/TravelConnect.Server/ ./TravelConnect.Server/
RUN dotnet publish "TravelConnect.Server/TravelConnect.Server.csproj" -c Release -o /app/publish

# ── Runtime stage ───────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Skia/QuestPDF font support: fontconfig offers metric-compatible
# substitutions (Arial -> Liberation Sans) for PDF generation.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libfontconfig1 \
        fontconfig \
        fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

ENV ASPNETCORE_URLS=http://+:8080

COPY --from=build /app/publish .

EXPOSE 8080

ENTRYPOINT ["dotnet", "TravelConnect.Server.dll"]
