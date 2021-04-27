# payments-api-webhook-example

## Prerequisites

- [Node.js](https://nodejs.org/en/)
- [npm](https://www.npmjs.com/)

## Usage

First run
```
npm install
```
to install dependencies, then
```
npm run start
```
to start the application.

It exposes an endpoint `/events` which can be hit with a TrueLayer payments webhook to test verification, and returns one of:

- HTTP 202: The webhook signature was successfully verified.
- HTTP 401: The webhook signature did not pass verification.
