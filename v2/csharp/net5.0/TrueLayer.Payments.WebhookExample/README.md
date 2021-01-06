# TrueLayer.Payments.WebhookExample

## Prerequisites

[.NET 5.0](https://dotnet.microsoft.com/download/dotnet/5.0)


## Usage

The application can be started with
```
dotnet run
```

It exposes an endpoint `/events` which can be hit with a TrueLayer payments webhook to test verification, and returns one of:

- HTTP 202: The webhook signature was successfully verified.
- HTTP 401: The webhook signature did not pass verification.
