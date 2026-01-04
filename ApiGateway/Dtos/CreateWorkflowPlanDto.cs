using System.Text.Json;

namespace ApiGateway.Dtos;

public record class CreateWorkflowPlanDto(
    string TaskId,
    JsonElement Graph
);