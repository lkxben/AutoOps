FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:8.0-jammy AS build 
WORKDIR /src

COPY EventService/EventService.csproj ./EventService/
COPY Contracts/Contracts.csproj ./Contracts/

RUN dotnet restore ./EventService/EventService.csproj

COPY EventService ./EventService
COPY Contracts ./Contracts

RUN dotnet publish ./EventService/EventService.csproj -c Release -o /app/publish

FROM base AS final
ENV ASPNETCORE_URLS=http://+:5004
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "EventService.dll"]