namespace ApiGateway.Dtos;
using WorkflowService.Protos;

public record class WorkflowPlanDto(
    string Id,
    string TaskId,
    string Graph,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);