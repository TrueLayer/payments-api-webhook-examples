# tl-payments-webhook-example

## Prerequisites

* python 3.6+
* pip dependencies from requirements.txt:

```
pip install -r requirements.txt
```

## Usage

The application can be started with
```
python app.py
```

It exposes an endpoint `/events` which can be hit with a TrueLayer payments webhook to test verification, and returns one of:

- HTTP 202: The webhook signature was successfully verified.
- HTTP 401: The webhook signature did not pass verification.
