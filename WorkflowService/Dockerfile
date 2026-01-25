FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:8.0-jammy AS build 
WORKDIR /src

COPY WorkflowService/WorkflowService.csproj ./WorkflowService/
COPY Contracts/Contracts.csproj ./Contracts/

RUN dotnet restore ./WorkflowService/WorkflowService.csproj

COPY WorkflowService ./WorkflowService
COPY Contracts ./Contracts

RUN dotnet publish ./WorkflowService/WorkflowService.csproj -c Release -o /app/publish

FROM base AS final
ENV ASPNETCORE_URLS=http://+:5003
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "WorkflowService.dll"]