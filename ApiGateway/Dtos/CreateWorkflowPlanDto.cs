using System.Text.Json.Nodes;

namespace ApiGateway.Dtos;

public record class CreateWorkflowPlanDto(
    string TaskId,
    JsonNode Plan
);