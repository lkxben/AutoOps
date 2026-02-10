FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:8.0-jammy AS build 
WORKDIR /src

COPY SchedulerService/SchedulerService.csproj ./SchedulerService/
COPY Contracts/Contracts.csproj ./Contracts/

RUN dotnet restore ./SchedulerService/SchedulerService.csproj

COPY SchedulerService ./SchedulerService
COPY Contracts ./Contracts

RUN dotnet publish ./SchedulerService/SchedulerService.csproj -c Release -o /app/publish

FROM base AS final
ENV ASPNETCORE_URLS=http://+:5007
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "SchedulerService.dll"]