using Grpc.Core;
using Grpc.Core.Interceptors;

public class DeadlineInterceptor : Interceptor
{
    private readonly TimeSpan _deadline;

    public DeadlineInterceptor(TimeSpan deadline)
    {
        _deadline = deadline;
    }

    public override AsyncUnaryCall<TResponse> AsyncUnaryCall<TRequest, TResponse>(
        TRequest request,
        ClientInterceptorContext<TRequest, TResponse> context,
        AsyncUnaryCallContinuation<TRequest, TResponse> continuation)
    {
        var optionsWithDeadline = context.Options.WithDeadline(DateTime.UtcNow + _deadline);
        var newContext = new ClientInterceptorContext<TRequest, TResponse>(
            context.Method,
            context.Host,
            optionsWithDeadline
        );
        return base.AsyncUnaryCall(request, newContext, continuation);
    }
}