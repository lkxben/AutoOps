using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Builder;
using System.ComponentModel.DataAnnotations;

public class ValidationFilter<T> : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var arg = context.Arguments.OfType<T>().FirstOrDefault();
        if (arg == null) return await next(context);

        var validationResults = new List<ValidationResult>();
        var validationContext = new ValidationContext(arg);

        if (!Validator.TryValidateObject(arg, validationContext, validationResults, true))
        {
            var errors = validationResults
                .SelectMany(r => r.MemberNames.Select(m => new { Field = m, Error = r.ErrorMessage }))
                .ToArray();

            return Results.BadRequest(new { errors });
        }

        return await next(context);
    }
}