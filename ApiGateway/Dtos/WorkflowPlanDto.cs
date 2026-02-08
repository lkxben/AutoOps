namespace ApiGateway.Dtos;

public record class WorkflowPlanDto(
    string Id,
    string TaskId,
    string Graph,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);